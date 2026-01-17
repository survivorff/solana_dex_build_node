import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

// 配置 axios 超时时间
axios.defaults.timeout = 60000; // 60 秒

// 测试 PumpSwap 精确报价
async function testPumpSwapQuote() {
  console.log('🧪 Testing PumpSwap Accurate Quote\n');

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
    console.log('  Market:', quote.market);
    console.log('  Pool Address:', quote.poolAddress);
    console.log('  Time Taken:', quote.timeTaken + 'ms');

    if (quote.details) {
      console.log('\n📊 Details:');
      console.log('  Spot Price:', quote.details.spotPrice);
      console.log('  Execution Price:', quote.details.executionPrice);
      console.log('  Trade Fee:', quote.details.fees.tradeFee);
      console.log('  Protocol Fee:', quote.details.fees.protocolFee);
      console.log('  Total Fee:', quote.details.fees.totalFee);
    }

    console.log('\n✅ PumpSwap Quote Test Passed');
  } catch (error: any) {
    console.error('\n❌ PumpSwap Quote Test Failed:');
    console.error('  Error:', error.response?.data || error.message);
  }
}

// 运行测试
testPumpSwapQuote().catch(console.error);
