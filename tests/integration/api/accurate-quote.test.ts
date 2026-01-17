import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

// 配置 axios 超时时间
axios.defaults.timeout = 60000; // 60 秒

// 测试 Raydium CPMM 精确报价
async function testAccurateQuote() {
  console.log('🧪 Testing Accurate Quote for Raydium CPMM\n');

  try {
    // 使用一个已知的 Raydium CPMM 池子进行测试
    // 这是一个 SOL-USDC CPMM 池子地址（示例）
    const quoteRequest = {
      inputMint: NATIVE_SOL_MINT,
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      amount: '10000000', // 0.01 SOL
      slippageBps: 100, // 1%
      market: 'RAYDIUM_CPMM',
      poolAddress: '61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht'  // 已知的 SOL-USDC CPMM 池子
    };

    console.log('📤 Request:', JSON.stringify(quoteRequest, null, 2));

    const response = await axios.post(`${API_BASE_URL}/quote`, quoteRequest);
    const quote = response.data;

    console.log('\n📥 Response:');
    console.log('  Input Amount:', quote.inAmount);
    console.log('  Output Amount:', quote.outAmount);
    console.log('  Min Output (with slippage):', quote.otherAmountThreshold);
    console.log('  Price Impact:', quote.priceImpactPct + '%');
    console.log('  Pool Address:', quote.poolAddress);

    if (quote.details) {
      console.log('\n📊 Detailed Information:');
      console.log('  Spot Price:', quote.details.spotPrice);
      console.log('  Execution Price:', quote.details.executionPrice);
      console.log('  Trade Fee:', quote.details.fees.tradeFee);
      console.log('  Protocol Fee:', quote.details.fees.protocolFee);
      console.log('  Total Fee:', quote.details.fees.totalFee);
      console.log('\n  Pool Reserves:');
      console.log('    Base:', quote.details.route.reserves.base);
      console.log('    Quote:', quote.details.route.reserves.quote);
      console.log('  Pool Decimals:');
      console.log('    Base:', quote.details.route.decimals.base);
      console.log('    Quote:', quote.details.route.decimals.quote);
    }

    console.log('\n✅ Accurate quote test passed!');
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// 测试回退机制（使用不支持精确计算的市场）
async function testFallback() {
  console.log('\n🧪 Testing Fallback to Simple Calculation\n');

  try {
    const quoteRequest = {
      inputMint: NATIVE_SOL_MINT,
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: '10000000',
      slippageBps: 100,
      market: 'PUMP_FUN' // 不支持精确计算的市场
    };

    console.log('📤 Request:', JSON.stringify(quoteRequest, null, 2));

    const response = await axios.post(`${API_BASE_URL}/quote`, quoteRequest);
    const quote = response.data;

    console.log('\n📥 Response:');
    console.log('  Input Amount:', quote.inAmount);
    console.log('  Output Amount:', quote.outAmount);
    console.log('  Min Output (with slippage):', quote.otherAmountThreshold);
    console.log('  Price Impact:', quote.priceImpactPct + '%');

    if (!quote.details) {
      console.log('\n✅ Fallback test passed! (No detailed info as expected)');
    } else {
      console.log('\n⚠️  Unexpected: Got detailed info for unsupported market');
    }
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 Starting Accurate Quote Tests\n');
  console.log('Make sure the API server is running on port 3000\n');
  console.log('=' .repeat(60));

  await testAccurateQuote();
  await testFallback();

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!\n');
}

main();
