import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { AccurateQuoteResult, AccurateQuoteParams } from '../../interfaces/quote';

// PumpSwap Program ID
const PUMP_SWAP_PROGRAM_ID = new PublicKey('PSwapMdSP4Y74jZVRvRzRCeRfN1yJLqqeVRK2JwfNvT');

// Pool 账户结构偏移量
const OFFSET_POOL_BASE_AMOUNT = 72;
const OFFSET_POOL_QUOTE_AMOUNT = 80;
const OFFSET_TRADE_FEE_RATE = 88;
const OFFSET_PROTOCOL_FEE_RATE = 96;

/**
 * 读取 PumpSwap 池子账户数据
 */
async function getPumpSwapPoolData(
  connection: Connection,
  tokenMint: PublicKey
) {
  // 计算池子 PDA
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), tokenMint.toBuffer()],
    PUMP_SWAP_PROGRAM_ID
  );

  const accountInfo = await connection.getAccountInfo(poolPda);
  if (!accountInfo) {
    throw new Error('PumpSwap pool not found');
  }

  const data = accountInfo.data;

  // 解析账户数据
  return {
    poolPda,
    poolBaseAmount: new BN(data.slice(OFFSET_POOL_BASE_AMOUNT, OFFSET_POOL_BASE_AMOUNT + 8), 'le'),
    poolQuoteAmount: new BN(data.slice(OFFSET_POOL_QUOTE_AMOUNT, OFFSET_POOL_QUOTE_AMOUNT + 8), 'le'),
    tradeFeeRate: new BN(data.slice(OFFSET_TRADE_FEE_RATE, OFFSET_TRADE_FEE_RATE + 8), 'le'),
    protocolFeeRate: new BN(data.slice(OFFSET_PROTOCOL_FEE_RATE, OFFSET_PROTOCOL_FEE_RATE + 8), 'le'),
  };
}

/**
 * 计算 PumpSwap 输出
 */
function calculatePumpSwapOutput(
  inputAmount: BN,
  inputReserve: BN,
  outputReserve: BN,
  tradeFeeRate: BN,
  protocolFeeRate: BN
): { outputAmount: BN; tradeFee: BN; protocolFee: BN } {
  const BPS_DENOMINATOR = new BN(10000);

  // 1. 计算总费率
  const totalFeeRate = tradeFeeRate.add(protocolFeeRate);

  // 2. 扣除手续费
  const feeAmount = inputAmount.mul(totalFeeRate).div(BPS_DENOMINATOR);
  const inputAfterFee = inputAmount.sub(feeAmount);

  // 3. AMM 公式: Δy = y * Δx / (x + Δx)
  const numerator = outputReserve.mul(inputAfterFee);
  const denominator = inputReserve.add(inputAfterFee);
  const outputAmount = numerator.div(denominator);

  // 4. 分配手续费
  const tradeFee = feeAmount.mul(tradeFeeRate).div(totalFeeRate);
  const protocolFee = feeAmount.mul(protocolFeeRate).div(totalFeeRate);

  return { outputAmount, tradeFee, protocolFee };
}

/**
 * PumpSwap 原生 quote 实现
 */
export async function getPumpSwapAccurateQuoteNative(
  connection: Connection,
  params: AccurateQuoteParams
): Promise<AccurateQuoteResult> {
  const { inputMint, outputMint, amount, slippageBps } = params;

  const WSOL = 'So11111111111111111111111111111111111111112';
  const isBuy = inputMint.toBase58() === WSOL;
  const tokenMint = isBuy ? outputMint : inputMint;

  // 1. 读取池子数据（1 次 RPC）
  const poolData = await getPumpSwapPoolData(connection, tokenMint);

  // 2. 计算输出
  const inputAmount = new BN(amount);
  const { outputAmount, tradeFee, protocolFee } = calculatePumpSwapOutput(
    inputAmount,
    isBuy ? poolData.poolQuoteAmount : poolData.poolBaseAmount,
    isBuy ? poolData.poolBaseAmount : poolData.poolQuoteAmount,
    poolData.tradeFeeRate,
    poolData.protocolFeeRate
  );

  // 3. 计算滑点保护
  const minOutputAmount = outputAmount
    .mul(new BN(10000 - slippageBps))
    .div(new BN(10000));

  // 4. 计算价格
  const spotPrice = (isBuy ? poolData.poolBaseAmount : poolData.poolQuoteAmount)
    .mul(new BN(1e9))
    .div(isBuy ? poolData.poolQuoteAmount : poolData.poolBaseAmount)
    .toNumber() / 1e9;

  const executionPrice = outputAmount
    .mul(new BN(1e9))
    .div(inputAmount)
    .toNumber() / 1e9;

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
      totalFee: tradeFee.add(protocolFee).toString(),
    },

    poolInfo: {
      poolAddress: poolData.poolPda.toBase58(),
      reserves: {
        base: poolData.poolBaseAmount.toString(),
        quote: poolData.poolQuoteAmount.toString(),
      },
      decimals: {
        base: 6, // Token decimals
        quote: 9, // SOL decimals
      },
    },
  };
}
