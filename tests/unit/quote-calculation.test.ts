import BN from 'bn.js';
import { CurveCalculator } from '@raydium-io/raydium-sdk-v2';

/**
 * Unit test for quote calculation logic
 * This test doesn't require external API or RPC calls
 */

console.log('🧪 Testing Quote Calculation Logic\n');

// Mock pool data (example values)
const baseReserve = new BN('1000000000000'); // 1M tokens
const quoteReserve = new BN('500000000000'); // 500K tokens
const inputAmount = new BN('10000000'); // 0.01 token

// Mock fee rates (typical Raydium CPMM values)
const tradeFeeRate = new BN(25); // 0.25%
const creatorFeeRate = new BN(0);
const protocolFeeRate = new BN(0);
const fundFeeRate = new BN(0);

console.log('📊 Pool State:');
console.log('  Base Reserve:', baseReserve.toString());
console.log('  Quote Reserve:', quoteReserve.toString());
console.log('  Input Amount:', inputAmount.toString());
console.log('  Trade Fee Rate:', tradeFeeRate.toString(), 'bps\n');

// Calculate swap
const swapResult = CurveCalculator.swapBaseInput(
  inputAmount,
  baseReserve,
  quoteReserve,
  tradeFeeRate,
  creatorFeeRate,
  protocolFeeRate,
  fundFeeRate
);

console.log('✅ Swap Calculation Result:');
console.log('  Output Amount:', swapResult.destinationAmountSwapped.toString());
console.log('  Trade Fee:', swapResult.tradeFee.toString());
console.log('  Protocol Fee:', swapResult.protocolFee.toString());
console.log('  Fund Fee:', swapResult.fundFee.toString());

// Calculate price
const price = quoteReserve.mul(new BN(1e9)).div(baseReserve);
console.log('\n💰 Price:');
console.log('  Spot Price:', (price.toNumber() / 1e9).toFixed(6));

// Calculate price impact
const priceImpact = inputAmount.mul(new BN(10000)).div(baseReserve);
console.log('  Price Impact:', (priceImpact.toNumber() / 100).toFixed(4) + '%');
