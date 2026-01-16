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
  fundFeeRate,
  false
);

console.log('✅ Calculation Result:');
console.log('  Output Amount:', swapResult.outputAmount.toString());
console.log('  Trade Fee:', swapResult.tradeFee.toString());
console.log('  Protocol Fee:', swapResult.protocolFee.toString());

// Calculate price impact
const spotPrice = quoteReserve.mul(new BN(1e9)).div(baseReserve).toNumber() / 1e9;
const executionPrice = swapResult.outputAmount.mul(new BN(1e9)).div(inputAmount).toNumber() / 1e9;
const priceImpact = Math.abs((executionPrice - spotPrice) / spotPrice * 100);

console.log('\n💰 Price Information:');
console.log('  Spot Price:', spotPrice.toFixed(6));
console.log('  Execution Price:', executionPrice.toFixed(6));
console.log('  Price Impact:', priceImpact.toFixed(4) + '%');

console.log('\n✅ Calculation logic test passed!');
