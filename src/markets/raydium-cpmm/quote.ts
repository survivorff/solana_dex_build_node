import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Raydium, CurveCalculator, FeeOn } from '@raydium-io/raydium-sdk-v2';
import { AccurateQuoteResult, AccurateQuoteParams } from '../../interfaces/quote';
import { assertCpmmHasMintAndWsol, findCpmmPoolInfo } from './pool-utils';

/**
 * Get accurate quote for Raydium CPMM swap
 */
export async function getRaydiumCpmmAccurateQuote(
  connection: Connection,
  params: AccurateQuoteParams
): Promise<AccurateQuoteResult> {
  const { inputMint, outputMint, amount, slippageBps, poolAddress } = params;

  // Determine which mint is the token (non-SOL)
  const WSOL = 'So11111111111111111111111111111111111111112';
  const isBuy = inputMint.toBase58() === WSOL;
  const tokenMint = isBuy ? outputMint : inputMint;

  // Initialize Raydium SDK with disableLoadToken to skip token list loading
  const raydium = await Raydium.load({
    connection,
    owner: tokenMint,
    disableLoadToken: true  // 跳过 token 列表加载
  });

  // Find pool info
  let poolInfo: any;
  let rpcData: any;

  if (poolAddress) {
    // Use specific pool if provided - fetch directly from RPC
    const rpc = await raydium.cpmm.getPoolInfoFromRpc(poolAddress.toBase58());
    poolInfo = rpc.poolInfo;
    rpcData = rpc.rpcData;
    assertCpmmHasMintAndWsol(poolInfo, tokenMint);
  } else {
    // Find pool by token mint (requires API)
    poolInfo = await findCpmmPoolInfo(raydium, tokenMint);
    assertCpmmHasMintAndWsol(poolInfo, tokenMint);

    // Get real-time pool data from RPC
    const rpc = await raydium.cpmm.getPoolInfoFromRpc(String(poolInfo.id));
    rpcData = rpc.rpcData;
  }

  // Determine swap direction
  const baseIn = isBuy
    ? poolInfo.mintA.address === WSOL
    : poolInfo.mintA.address === tokenMint.toBase58();

  const inputAmount = new BN(amount);
  const inputDecimals = Number((baseIn ? poolInfo.mintA : poolInfo.mintB).decimals);
  const outputDecimals = Number((baseIn ? poolInfo.mintB : poolInfo.mintA).decimals);

  // Calculate swap using Raydium's curve calculator
  const swapResult = CurveCalculator.swapBaseInput(
    inputAmount,
    baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
    baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
    rpcData.configInfo!.tradeFeeRate,
    rpcData.configInfo!.creatorFeeRate,
    rpcData.configInfo!.protocolFeeRate,
    rpcData.configInfo!.fundFeeRate,
    rpcData.feeOn === FeeOn.BothToken || rpcData.feeOn === FeeOn.OnlyTokenB
  );

  const outputAmount = swapResult.outputAmount;
  const totalFee = swapResult.tradeFee.add(swapResult.protocolFee);

  // Calculate slippage protection
  const slippageMultiplier = 10000 - slippageBps;
  const minOutputAmount = outputAmount.mul(new BN(slippageMultiplier)).div(new BN(10000));

  // Calculate spot price (price without impact)
  const baseReserve = baseIn ? rpcData.baseReserve : rpcData.quoteReserve;
  const quoteReserve = baseIn ? rpcData.quoteReserve : rpcData.baseReserve;
  const spotPrice = quoteReserve.mul(new BN(10).pow(new BN(inputDecimals)))
    .div(baseReserve)
    .toNumber() / Math.pow(10, outputDecimals);

  // Calculate execution price
  const executionPrice = outputAmount.mul(new BN(10).pow(new BN(inputDecimals)))
    .div(inputAmount)
    .toNumber() / Math.pow(10, outputDecimals);

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
      tradeFee: swapResult.tradeFee.toString(),
      protocolFee: swapResult.protocolFee.toString(),
      totalFee: totalFee.toString(),
    },

    poolInfo: {
      poolAddress: String(poolInfo.id),
      reserves: {
        base: rpcData.baseReserve.toString(),
        quote: rpcData.quoteReserve.toString(),
      },
      decimals: {
        base: inputDecimals,
        quote: outputDecimals,
      },
    },
  };
}
