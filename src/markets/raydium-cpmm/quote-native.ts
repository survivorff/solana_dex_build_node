import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { AccurateQuoteResult, AccurateQuoteParams } from '../../interfaces/quote';

// Raydium CPMM Program ID
const RAYDIUM_CPMM_PROGRAM_ID = new PublicKey('CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C');

// Pool 账户结构偏移量（需要通过分析确定）
const OFFSET_BASE_RESERVE = 73;
const OFFSET_QUOTE_RESERVE = 81;
const OFFSET_TRADE_FEE_RATE = 89;
const OFFSET_PROTOCOL_FEE_RATE = 97;
const OFFSET_FUND_FEE_RATE = 105;

/**
 * 读取 Raydium CPMM 池子账户数据
 */
async function getRaydiumCpmmPoolData(
  connection: Connection,
  poolAddress: PublicKey
) {
  const accountInfo = await connection.getAccountInfo(poolAddress);
  if (!accountInfo) {
    throw new Error('Raydium CPMM pool not found');
  }

  const data = accountInfo.data;

  // 解析账户数据
  return {
    baseReserve: new BN(data.slice(OFFSET_BASE_RESERVE, OFFSET_BASE_RESERVE + 8), 'le'),
    quoteReserve: new BN(data.slice(OFFSET_QUOTE_RESERVE, OFFSET_QUOTE_RESERVE + 8), 'le'),
    tradeFeeRate: new BN(data.slice(OFFSET_TRADE_FEE_RATE, OFFSET_TRADE_FEE_RATE + 8), 'le'),
    protocolFeeRate: new BN(data.slice(OFFSET_PROTOCOL_FEE_RATE, OFFSET_PROTOCOL_FEE_RATE + 8), 'le'),
    fundFeeRate: new BN(data.slice(OFFSET_FUND_FEE_RATE, OFFSET_FUND_FEE_RATE + 8), 'le'),
  };
}

/**
 * 计算 Raydium CPMM swap 输出
 */
function calculateRaydiumCpmmSwap(
  inputAmount: BN,
  inputReserve: BN,
  outputReserve: BN,
  tradeFeeRate: BN,
  protocolFeeRate: BN,
  fundFeeRate: BN
): { outputAmount: BN; tradeFee: BN; protocolFee: BN; fundFee: BN } {
  const BPS_DENOMINATOR = new BN(10000);

  // 1. 计算总费率
  const totalFeeRate = tradeFeeRate.add(protocolFeeRate).add(fundFeeRate);

  // 2. 扣除手续费后的输入
  const feeAmount = inputAmount.mul(totalFeeRate).div(BPS_DENOMINATOR);
  const inputAfterFee = inputAmount.sub(feeAmount);

  // 3. 恒定乘积公式: k = x * y
  // (x + Δx) * (y - Δy) = k
  // Δy = y * Δx / (x + Δx)
  const numerator = outputReserve.mul(inputAfterFee);
  const denominator = inputReserve.add(inputAfterFee);
  const outputAmount = numerator.div(denominator);

  // 4. 分配手续费
  const tradeFee = feeAmount.mul(tradeFeeRate).div(totalFeeRate);
  const protocolFee = feeAmount.mul(protocolFeeRate).div(totalFeeRate);
  const fundFee = feeAmount.mul(fundFeeRate).div(totalFeeRate);

  return { outputAmount, tradeFee, protocolFee, fundFee };
}

/**
 * Raydium CPMM 原生 quote 实现
 */
export async function getRaydiumCpmmAccurateQuoteNative(
  connection: Connection,
  params: AccurateQuoteParams
): Promise<AccurateQuoteResult> {
  const { inputMint, outputMint, amount, slippageBps, poolAddress } = params;

  if (!poolAddress) {
    throw new Error('poolAddress is required for Raydium CPMM native implementation');
  }

  // 1. 读取池子数据（1 次 RPC）
  const poolData = await getRaydiumCpmmPoolData(connection, poolAddress);

  // 2. 确定交易方向
  const WSOL = 'So11111111111111111111111111111111111111112';
  const isBuy = inputMint.toBase58() === WSOL;

  // 3. 计算输出
  const inputAmount = new BN(amount);
  const { outputAmount, tradeFee, protocolFee, fundFee } = calculateRaydiumCpmmSwap(
    inputAmount,
    isBuy ? poolData.quoteReserve : poolData.baseReserve,
    isBuy ? poolData.baseReserve : poolData.quoteReserve,
    poolData.tradeFeeRate,
    poolData.protocolFeeRate,
    poolData.fundFeeRate
  );

  // 4. 计算滑点保护
  const minOutputAmount = outputAmount
    .mul(new BN(10000 - slippageBps))
    .div(new BN(10000));

  // 5. 计算价格
  const spotPrice = (isBuy ? poolData.baseReserve : poolData.quoteReserve)
    .mul(new BN(1e9))
    .div(isBuy ? poolData.quoteReserve : poolData.baseReserve)
    .toNumber() / 1e9;

  const executionPrice = outputAmount
    .mul(new BN(1e9))
    .div(inputAmount)
    .toNumber() / 1e9;

  const priceImpact = Math.abs((executionPrice - spotPrice) / spotPrice * 100);

  const totalFee = tradeFee.add(protocolFee).add(fundFee);

  return {
    inAmount: inputAmount.toString(),
    outAmount: outputAmount.toString(),
    otherAmountThreshold: minOutputAmount.toString(),

    spotPrice: spotPrice.toString(),
    executionPrice: executionPrice.toString(),
    priceImpactPct: priceImpact.toFixed(4),

    fees: {
      tradeFee: tradeFee.toString(),
      protocolFee: protocolFee.add(fundFee).toString(), // 合并协议费和基金费
      totalFee: totalFee.toString(),
    },

    poolInfo: {
      poolAddress: poolAddress.toBase58(),
      reserves: {
        base: poolData.baseReserve.toString(),
        quote: poolData.quoteReserve.toString(),
      },
      decimals: {
        base: 6, // 需要从 mint 账户读取
        quote: 9,
      },
    },
  };
}
