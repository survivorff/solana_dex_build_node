import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

// 配置 axios 超时时间
axios.defaults.timeout = 60000; // 60 秒

// 测试 PumpFun 精确报价
async function testPumpFunQuote() {
  console.log('🧪 Testing PumpFun Accurate Quote\n');

  try {
    // 使用一个已知的 PumpFun token
    const quoteRequest = {
      inputMint: NATIVE_SOL_MINT,
      outputMint: 'YOUR_PUMPFUN_TOKEN_MINT', // 替换为实际的 PumpFun token mint
      amount: '10000000', // 0.01 SOL
      slippageBps: 100, // 1%
      market: 'PUMP_FUN'
    };

    console.log('📤 Request:', JSON.stringify(quoteRequest, null, 2));

    const response = await axios.post(`${API_BASE_URL}/quote`, quoteRequest);
    const quote = response.data;

    console.log('\n📥 Response:');
    console.log('  Input Amount:', quote.inAmount);
    console.log('  Output Amount:', quote.outAmount);
    console.log('  Min Output (with slippage):', quote.otherAmountThreshold);
    console.log('  Price Impact:', quote.priceImpactPct + '%');

    if (quote.details) {
      console.log('\n📊 Detailed Information:');
      console.log('  Spot Price:', quote.details.spotPrice);
      console.log('  Execution Price:', quote.details.executionPrice);
      console.log('  Trade Fee:', quote.details.fees.tradeFee);
      console.log('  Total Fee:', quote.details.fees.totalFee);
      console.log('\n  Bonding Curve:');
      console.log('    Address:', quote.details.route.poolAddress);
      console.log('    Token Reserve:', quote.details.route.reserves.base);
      console.log('    SOL Reserve:', quote.details.route.reserves.quote);
    }

    console.log('\n✅ PumpFun quote test passed!');
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// 测试 PumpSwap 精确报价
async function testPumpSwapQuote() {
  console.log('\n🧪 Testing PumpSwap Accurate Quote\n');

  try {
    const quoteRequest = {
      inputMint: NATIVE_SOL_MINT,
      outputMint: 'YOUR_PUMPSWAP_TOKEN_MINT', // 替换为实际的 PumpSwap token mint
      amount: '10000000', // 0.01 SOL
      slippageBps: 100, // 1%
      market: 'PUMP_SWAP'
    };

    console.log('📤 Request:', JSON.stringify(quoteRequest, null, 2));

    const response = await axios.post(`${API_BASE_URL}/quote`, quoteRequest);
    const quote = response.data;

    console.log('\n📥 Response:');
    console.log('  Input Amount:', quote.inAmount);
    console.log('  Output Amount:', quote.outAmount);
    console.log('  Min Output (with slippage):', quote.otherAmountThreshold);
    console.log('  Price Impact:', quote.priceImpactPct + '%');

    if (quote.details) {
      console.log('\n📊 Detailed Information:');
      console.log('  Spot Price:', quote.details.spotPrice);
      console.log('  Execution Price:', quote.details.executionPrice);
      console.log('  Trade Fee:', quote.details.fees.tradeFee);
      console.log('  Protocol Fee:', quote.details.fees.protocolFee);
      console.log('  Total Fee:', quote.details.fees.totalFee);
      console.log('\n  Pool:');
      console.log('    Address:', quote.details.route.poolAddress);
      console.log('    Base Reserve:', quote.details.route.reserves.base);
      console.log('    Quote Reserve:', quote.details.route.reserves.quote);
    }

    console.log('\n✅ PumpSwap quote test passed!');
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 Starting PumpFun & PumpSwap Quote Tests\n');
  console.log('Make sure the API server is running on port 3000\n');
  console.log('=' .repeat(60));

  await testPumpFunQuote();
  await testPumpSwapQuote();

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!\n');
}

main();
