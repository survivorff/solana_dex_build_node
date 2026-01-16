import { PublicKey } from '@solana/web3.js';

/**
 * Accurate quote calculation result
 */
export interface AccurateQuoteResult {
  // Input/Output amounts
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;  // Minimum output with slippage

  // Price information
  spotPrice: string;              // Current spot price
  executionPrice: string;         // Actual execution price
  priceImpactPct: string;         // Price impact percentage

  // Fee breakdown
  fees: {
    tradeFee: string;             // Trading fee in output token
    protocolFee?: string;         // Protocol fee (if applicable)
    totalFee: string;             // Total fees
  };

  // Pool information
  poolInfo: {
    poolAddress: string;
    reserves: {
      base: string;
      quote: string;
    };
    decimals: {
      base: number;
      quote: number;
    };
  };
}

/**
 * Parameters for accurate quote calculation
 */
export interface AccurateQuoteParams {
  inputMint: PublicKey;
  outputMint: PublicKey;
  amount: string;                 // Input amount in smallest unit
  slippageBps: number;            // Slippage in basis points
  poolAddress?: PublicKey;        // Optional: specific pool address
}
