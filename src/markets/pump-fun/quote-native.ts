import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { AccurateQuoteResult, AccurateQuoteParams } from '../../interfaces/quote';

// PumpFun Program ID
const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

// Bonding curve 账户结构偏移量（通过分析 SDK 和链上数据获得）
const OFFSET_VIRTUAL_TOKEN_RESERVES = 8;
const OFFSET_VIRTUAL_SOL_RESERVES = 16;
const OFFSET_REAL_TOKEN_RESERVES = 24;
const OFFSET_REAL_SOL_RESERVES = 32;
const OFFSET_TOKEN_TOTAL_SUPPLY = 40;
const OFFSET_COMPLETE = 48;

/**
 * 读取 PumpFun Bonding Curve 账户数据
 */
async function getPumpFunBondingCurveData(
  connection: Connection,
  tokenMint: PublicKey
) {
  // 计算 bonding curve PDA
  const [bondingCurvePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), tokenMint.toBuffer()],
    PUMP_FUN_PROGRAM_ID
  );

  const accountInfo = await connection.getAccountInfo(bondingCurvePda);
  if (!accountInfo) {
    throw new Error('PumpFun bonding curve not found');
  }

  const data = accountInfo.data;

  // 解析账户数据
  return {
    bondingCurvePda,
    virtualTokenReserves: new BN(data.slice(OFFSET_VIRTUAL_TOKEN_RESERVES, OFFSET_VIRTUAL_TOKEN_RESERVES + 8), 'le'),
    virtualSolReserves: new BN(data.slice(OFFSET_VIRTUAL_SOL_RESERVES, OFFSET_VIRTUAL_SOL_RESERVES + 8), 'le'),
    realTokenReserves: new BN(data.slice(OFFSET_REAL_TOKEN_RESERVES, OFFSET_REAL_TOKEN_RESERVES + 8), 'le'),
    realSolReserves: new BN(data.slice(OFFSET_REAL_SOL_RESERVES, OFFSET_REAL_SOL_RESERVES + 8), 'le'),
    tokenTotalSupply: new BN(data.slice(OFFSET_TOKEN_TOTAL_SUPPLY, OFFSET_TOKEN_TOTAL_SUPPLY + 8), 'le'),
    complete: data[OFFSET_COMPLETE] === 1,
  };
}

/**
 * 计算 PumpFun swap 输出
 */
function calculatePumpFunSwap(
  inputAmount: BN,
  isBuy: boolean,
  virtualSolReserves: BN,
  virtualTokenReserves: BN
): { outputAmount: BN; fee: BN } {
  const FEE_BPS = new BN(100); // 1%
  const BPS_DENOMINATOR = new BN(10000);

  if (isBuy) {
    // 买入: SOL -> Token
    // 1. 计算手续费
    const fee = inputAmount.mul(FEE_BPS).div(BPS_DENOMINATOR);
    const inputAfterFee = inputAmount.sub(fee);

    // 2. 使用恒定乘积公式
    // k = virtualSol * virtualToken
    const k = virtualSolReserves.mul(virtualTokenReserves);
    const newSolReserves = virtualSolReserves.add(inputAfterFee);
    const newTokenReserves = k.div(newSolReserves);

    // 3. 输出数量
    const outputAmount = virtualTokenReserves.sub(newTokenReserves);

    return { outputAmount, fee };
  } else {
    // 卖出: Token -> SOL
    // 1. 使用恒定乘积公式
    const k = virtualSolReserves.mul(virtualTokenReserves);
    const newTokenReserves = virtualTokenReserves.add(inputAmount);
    const newSolReserves = k.div(newTokenReserves);

    // 2. 计算 SOL 输出
    const solOut = virtualSolReserves.sub(newSolReserves);

    // 3. 扣除手续费
    const fee = solOut.mul(FEE_BPS).div(BPS_DENOMINATOR);
    const outputAmount = solOut.sub(fee);

    return { outputAmount, fee };
  }
}

/**
 * PumpFun 原生 quote 实现
 */
export async function getPumpFunAccurateQuoteNative(
  connection: Connection,
  params: AccurateQuoteParams
): Promise<AccurateQuoteResult> {
  const { inputMint, outputMint, amount, slippageBps } = params;

  const WSOL = 'So11111111111111111111111111111111111111112';
  const isBuy = inputMint.toBase58() === WSOL;
  const tokenMint = isBuy ? outputMint : inputMint;

  // 1. 读取 bonding curve 数据（1 次 RPC）
  const curveData = await getPumpFunBondingCurveData(connection, tokenMint);

  if (curveData.complete) {
    throw new Error('PumpFun bonding curve is complete, token migrated to Raydium');
  }

  // 2. 计算输出
  const inputAmount = new BN(amount);
  const { outputAmount, fee } = calculatePumpFunSwap(
    inputAmount,
    isBuy,
    curveData.virtualSolReserves,
    curveData.virtualTokenReserves
  );

  // 3. 计算滑点保护
  const minOutputAmount = outputAmount
    .mul(new BN(10000 - slippageBps))
    .div(new BN(10000));

  // 4. 计算价格
  const spotPrice = isBuy
    ? curveData.virtualSolReserves
        .mul(new BN(1e9))
        .div(curveData.virtualTokenReserves)
        .toNumber() / 1e9
    : curveData.virtualTokenReserves
        .mul(new BN(1e9))
        .div(curveData.virtualSolReserves)
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
      tradeFee: fee.toString(),
      protocolFee: '0',
      totalFee: fee.toString(),
    },

    poolInfo: {
      poolAddress: curveData.bondingCurvePda.toBase58(),
      reserves: {
        base: curveData.virtualTokenReserves.toString(),
        quote: curveData.virtualSolReserves.toString(),
      },
      decimals: {
        base: 6, // PumpFun tokens are 6 decimals
        quote: 9, // SOL is 9 decimals
      },
    },
  };
}
