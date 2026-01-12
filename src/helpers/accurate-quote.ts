import { Connection, PublicKey } from '@solana/web3.js';
import { markets as Markets } from './constants';
import { AccurateQuoteResult, AccurateQuoteParams } from '../interfaces/quote';
import { getRaydiumCpmmAccurateQuote } from '../markets/raydium-cpmm/quote';
import { getRaydiumCpmmAccurateQuoteNative } from '../markets/raydium-cpmm/quote-native';
import { getPumpFunAccurateQuote } from '../markets/pump-fun/quote';
import { getPumpFunAccurateQuoteNative } from '../markets/pump-fun/quote-native';
import { getPumpSwapAccurateQuote } from '../markets/pump-swap/quote';
import { getPumpSwapAccurateQuoteNative } from '../markets/pump-swap/quote-native';

/**
 * Get accurate quote for any supported market
 * Uses native implementation (fast) with SDK fallback (reliable)
 */
export async function getAccurateQuote(
  connection: Connection,
  market: string,
  params: AccurateQuoteParams
): Promise<AccurateQuoteResult> {
  const key = (market || '').toUpperCase();

  // Raydium CPMM
  if (key === Markets.RAYDIUM_CPMM) {
    try {
      // 优先使用原生实现（快速）
      return await getRaydiumCpmmAccurateQuoteNative(connection, params);
    } catch (error) {
      console.warn('Raydium CPMM native failed, falling back to SDK:', (error as Error).message);
      // 回退到 SDK 实现
      return await getRaydiumCpmmAccurateQuote(connection, params);
    }
  }

  // PumpFun
  if (key === Markets.PUMP_FUN) {
    try {
      // 优先使用原生实现（快速）
      return await getPumpFunAccurateQuoteNative(connection, params);
    } catch (error) {
      console.warn('PumpFun native failed, falling back to SDK:', (error as Error).message);
      // 回退到 SDK 实现
      return await getPumpFunAccurateQuote(connection, params);
    }
  }

  // PumpSwap
  if (key === Markets.PUMP_SWAP) {
    try {
      // 优先使用原生实现（快速）
      return await getPumpSwapAccurateQuoteNative(connection, params);
    } catch (error) {
      console.warn('PumpSwap native failed, falling back to SDK:', (error as Error).message);
      // 回退到 SDK 实现
      return await getPumpSwapAccurateQuote(connection, params);
    }
  }

  // TODO: Implement other DEX accurate quotes
  // if (key === Markets.RAYDIUM_CLMM) return getRaydiumClmmAccurateQuote(connection, params);
  // if (key === Markets.RAYDIUM_AMM) return getRaydiumAmmAccurateQuote(connection, params);
  // if (key === Markets.ORCA_WHIRLPOOL) return getOrcaWhirlpoolAccurateQuote(connection, params);
  // if (key === Markets.METEORA_DLMM) return getMeteoraDlmmAccurateQuote(connection, params);
  // ... etc

  throw new Error(`Accurate quote not implemented for market ${market}`);
}
