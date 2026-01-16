import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { OnlinePumpAmmSdk, canonicalPumpPoolPda, sellBaseInput } from '@pump-fun/pump-swap-sdk';
import { AccurateQuoteResult, AccurateQuoteParams } from '../../interfaces/quote';

/**
 * Get accurate quote for PumpSwap
 * PumpSwap is an AMM similar to Uniswap V2
 */
export async function getPumpSwapAccurateQuote(
  connection: Connection,
  params: AccurateQuoteParams
): Promise<AccurateQuoteResult> {
  const { inputMint, outputMint, amount, slippageBps } = params;

  const WSOL = 'So11111111111111111111111111111111111111112';
  const isBuy = inputMint.toBase58() === WSOL;
  const tokenMint = isBuy ? outputMint : inputMint;

  const sdk = new OnlinePumpAmmSdk(connection);
  const poolKey = canonicalPumpPoolPda(tokenMint);
  const swapState = await sdk.swapSolanaState(poolKey, PublicKey.default);

  const inputAmount = new BN(amount);
  let result: any;

  if (isBuy) {
    // Buy: SOL -> Token
    // For buy, we swap SOL (quote) for Token (base)
    result = sellBaseInput({
      base: inputAmount,
      slippage: 0,
      baseReserve: swapState.poolQuoteAmount,
      quoteReserve: swapState.poolBaseAmount,
      globalConfig: swapState.globalConfig,
      baseMintAccount: { decimals: 9 } as any, // SOL decimals
      baseMint: new PublicKey(WSOL),
      coinCreator: swapState.pool.coinCreator,
      creator: swapState.pool.creator,
      feeConfig: swapState.feeConfig,
    });
  } else {
    // Sell: Token -> SOL
    result = sellBaseInput({
      base: inputAmount,
      slippage: 0,
      baseReserve: swapState.poolBaseAmount,
      quoteReserve: swapState.poolQuoteAmount,
      globalConfig: swapState.globalConfig,
      baseMintAccount: swapState.baseMintAccount,
      baseMint: swapState.baseMint,
      coinCreator: swapState.pool.coinCreator,
      creator: swapState.pool.creator,
      feeConfig: swapState.feeConfig,
    });
  }

  const outputAmount = new BN(result.quote.toString());
  const tradeFee = new BN(result.tradeFee?.toString() || '0');
  const protocolFee = new BN(result.protocolFee?.toString() || '0');
  const totalFee = tradeFee.add(protocolFee);

  // Calculate slippage protection
  const slippageMultiplier = 10000 - slippageBps;
  const minOutputAmount = outputAmount.mul(new BN(slippageMultiplier)).div(new BN(10000));

  // Calculate spot price
  const baseReserve = isBuy ? swapState.poolQuoteAmount : swapState.poolBaseAmount;
  const quoteReserve = isBuy ? swapState.poolBaseAmount : swapState.poolQuoteAmount;
  const spotPrice = new BN(quoteReserve.toString())
    .mul(new BN(1e9))
    .div(new BN(baseReserve.toString()))
    .toNumber() / 1e9;

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
      protocolFee: protocolFee.toString(),
      totalFee: totalFee.toString(),
    },

    poolInfo: {
      poolAddress: poolKey.toBase58(),
      reserves: {
        base: swapState.poolBaseAmount.toString(),
        quote: swapState.poolQuoteAmount.toString(),
      },
      decimals: {
        base: swapState.baseMintAccount.decimals,
        quote: 9, // SOL decimals
      },
    },
  };
}
