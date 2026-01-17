import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

// 配置 axios 超时时间
axios.defaults.timeout = 60000; // 60 秒

// 测试 Raydium CPMM 精确报价
async function testRaydiumCpmmQuote() {
  console.log('🧪 Testing Raydium CPMM Accurate Quote\n');

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
    console.log('  Market:', quote.market);
    console.log('  Pool Address:', quote.poolAddress);
    console.log('  Time Taken:', quote.timeTaken + 'ms');

    if (quote.details) {
      console.log('\n📊 Details:');
      console.log('  Spot Price:', quote.details.spotPrice);
      console.log('  Execution Price:', quote.details.executionPrice);
      console.log('  Trade Fee:', quote.details.fees.tradeFee);
      console.log('  Protocol Fee:', quote.details.fees.protocolFee);
      console.log('  Fund Fee:', quote.details.fees.fundFee || '0');
      console.log('  Total Fee:', quote.details.fees.totalFee);
    }

    console.log('\n✅ Raydium CPMM Quote Test Passed');
  } catch (error: any) {
    console.error('\n❌ Raydium CPMM Quote Test Failed:');
    console.error('  Error:', error.response?.data || error.message);
  }
}

// 运行测试
testRaydiumCpmmQuote().catch(console.error);
