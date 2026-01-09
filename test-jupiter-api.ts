import axios from 'axios';
import { Connection, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'http://localhost:3000';
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

// 测试配置
const TEST_CONFIG = {
  market: 'PUMP_FUN',
  tokenMint: 'TokenMintAddressHere',  // 🔑 替换为实际代币地址
  buyAmountLamports: 10000000,  // 0.01 SOL in lamports
  slippageBps: 1000,  // 10% 滑点
};

async function testQuoteAndSwap() {
  console.log('\n🧪 Testing Jupiter-style Quote & Swap API\n');
  console.log('='.repeat(60));

  try {
    // ============ 1. 健康检查 ============
    console.log('\n📊 Step 1: Health Check');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health:', healthResponse.data);

    // ============ 2. 获取支持的市场 ============
    console.log('\n📊 Step 2: Get Supported Markets');
    const marketsResponse = await axios.get(`${API_BASE_URL}/markets`);
    console.log('✅ Markets:', marketsResponse.data.markets.slice(0, 5), '...');

    // ============ 3. Quote 询价 (买入) ============
    console.log('\n📊 Step 3: Get Quote (Buy)');
    const quoteRequest = {
      inputMint: NATIVE_SOL_MINT,
      outputMint: TEST_CONFIG.tokenMint,
      amount: TEST_CONFIG.buyAmountLamports,
      slippageBps: TEST_CONFIG.slippageBps,
      market: TEST_CONFIG.market
    };
    console.log('Request:', JSON.stringify(quoteRequest, null, 2));

    const quoteResponse = await axios.post(`${API_BASE_URL}/quote`, quoteRequest);
    const quote = quoteResponse.data;
    console.log('✅ Quote Response:');
    console.log(`   Input: ${quote.inAmount} lamports (${Number(quote.inAmount) / 1e9} SOL)`);
    console.log(`   Output: ${quote.outAmount} tokens`);
    console.log(`   Min Output (with slippage): ${quote.otherAmountThreshold} tokens`);
    console.log(`   Slippage: ${quote.slippageBps / 100}%`);
    console.log(`   Market: ${quote.market}`);

    // ============ 4. Swap 构建交易 ============
    console.log('\n📊 Step 4: Build Swap Transaction');

    if (!process.env.PRIVATE_KEY) {
      console.log('⚠️  PRIVATE_KEY not found in .env, skipping swap transaction build');
      console.log('   To test swap, add PRIVATE_KEY to your .env file');
      return;
    }

    const wallet = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY));
    console.log('Wallet:', wallet.publicKey.toBase58());

    const swapRequest = {
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapUnwrapSOL: true,
      priorityFeeLamports: 100000  // 0.0001 SOL
    };

    const swapResponse = await axios.post(`${API_BASE_URL}/swap`, swapRequest);
    const { swapTransaction, lastValidBlockHeight } = swapResponse.data;

    console.log('✅ Swap Transaction Built:');
    console.log(`   Transaction (base64): ${swapTransaction.substring(0, 50)}...`);
    console.log(`   Last Valid Block Height: ${lastValidBlockHeight}`);

    // ============ 5. 签名并提交交易 (可选) ============
    console.log('\n📊 Step 5: Sign and Submit Transaction');
    console.log('⚠️  Skipping actual submission for safety');
    console.log('   To submit, uncomment the code below:');
    console.log(`
    // Decode transaction
    const txBuffer = Buffer.from(swapTransaction, 'base64');
    const transaction = Transaction.from(txBuffer);

    // Sign transaction
    transaction.sign(wallet);

    // Submit transaction
    const connection = new Connection(process.env.RPC_URL!, 'confirmed');
    const signature = await connection.sendRawTransaction(transaction.serialize());
    console.log('Transaction Signature:', signature);
    console.log('Explorer:', \`https://solscan.io/tx/\${signature}\`);
    `);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('Stack:', error.response.data.stack);
    }
  }
}

// 运行测试
testQuoteAndSwap();
