import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import { AccurateQuoteResult, AccurateQuoteParams } from '../../interfaces/quote';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { OnlinePumpSdk } = require('@pump-fun/pump-sdk');

/**
 * Get accurate quote for PumpFun swap
 * PumpFun uses a bonding curve model
 */
export async function getPumpFunAccurateQuote(
  connection: Connection,
  params: AccurateQuoteParams
): Promise<AccurateQuoteResult> {
  const { inputMint, outputMint, amount, slippageBps } = params;

  const WSOL = 'So11111111111111111111111111111111111111112';
  const isBuy = inputMint.toBase58() === WSOL;
  const tokenMint = isBuy ? outputMint : inputMint;

  const onlineSdk = new OnlinePumpSdk(connection);
  const bondingCurve = await onlineSdk.fetchBondingCurve(tokenMint);

  const inputAmount = new BN(amount);
  let outputAmount: BN;
  let tradeFee: BN;

  // Get current reserves
  const vSolReserves = new BN(bondingCurve.virtualSolReserves.toString());
  const vTokenReserves = new BN(bondingCurve.virtualTokenReserves.toString());

  if (isBuy) {
    // Buy: SOL -> Token (constant product: k = vSol * vToken)
    // Fee is 1% on input
    const feeAmount = inputAmount.mul(new BN(100)).div(new BN(10000)); // 1%
    const inputAfterFee = inputAmount.sub(feeAmount);

    // New SOL reserve = old + input after fee
    const newSolReserves = vSolReserves.add(inputAfterFee);

    // k = vSol * vToken (constant)
    const k = vSolReserves.mul(vTokenReserves);
    const newTokenReserves = k.div(newSolReserves);

    outputAmount = vTokenReserves.sub(newTokenReserves);
    tradeFee = feeAmount;
  } else {
    // Sell: Token -> SOL
    // Fee is 1% on output
    const newTokenReserves = vTokenReserves.add(inputAmount);
    const k = vSolReserves.mul(vTokenReserves);
    const newSolReserves = k.div(newTokenReserves);

    const solOut = vSolReserves.sub(newSolReserves);
    const feeAmount = solOut.mul(new BN(100)).div(new BN(10000)); // 1%

    outputAmount = solOut.sub(feeAmount);
    tradeFee = feeAmount;
  }

  // Calculate slippage protection
  const slippageMultiplier = 10000 - slippageBps;
  const minOutputAmount = outputAmount.mul(new BN(slippageMultiplier)).div(new BN(10000));

  // Calculate spot price
  const spotPrice = isBuy
    ? vSolReserves.mul(new BN(1e9)).div(vTokenReserves).toNumber() / 1e9
    : vTokenReserves.mul(new BN(1e9)).div(vSolReserves).toNumber() / 1e9;

  // Calculate execution price
  const executionPrice = outputAmount.mul(new BN(1e9)).div(inputAmount).toNumber() / 1e9;

  // Calculate price impact
  const priceImpact = Math.abs((executionPrice - spotPrice) / spotPrice * 100);

  return {
    inAmount: inputAmount.toString(),
    outAmount: outputAmount.toString(),
    otherAmountThreshold: minOutputAmount.toString(),

    spotPrice: spotPrice.toString(),
    executionPrice: executionPrice.toString(),
    priceImpactPct: priceImpact.toFixed(4),

    fees: {
      tradeFee: tradeFee.toString(),
      protocolFee: '0',
      totalFee: tradeFee.toString(),
    },

    poolInfo: {
      poolAddress: bondingCurve.publicKey.toBase58(),
      reserves: {
        base: vTokenReserves.toString(),
        quote: vSolReserves.toString(),
      },
      decimals: {
        base: 6, // PumpFun tokens are 6 decimals
        quote: 9, // SOL is 9 decimals
      },
    },
  };
}
