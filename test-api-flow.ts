/**
 * 完整测试流程：Quote -> Swap -> Sign -> Submit
 * 使用 Jupiter 风格的 API
 *
 * 使用说明：
 * 1. 复制 .env.example 为 .env
 * 2. 配置 RPC_URL 和 PRIVATE_KEY
 * 3. 运行: npx ts-node test-api-flow.ts
 */

import axios from 'axios';
import { Connection, Keypair, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';

dotenv.config();

// ============ 配置 ============
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

// 测试参数（请根据实际情况修改）
const TEST_CONFIG = {
  market: 'RAYDIUM_CLMM',  // 可选: RAYDIUM_CPMM, ORCA_WHIRLPOOL 等
  tokenMint: 'Ey59PH7Z4BFU4HjyKnyMdWt5GGN76KazTAwQihoUXRnk',  // 🔑 替换为实际的代币地址
  direction: 'buy',  // 'buy' or 'sell'
  amountSol: 0.0001,  // SOL数量（buy时）
  amountTokens: 1000,  // 代币数量（sell时）
  slippageBps: 1000,  // 滑点基点 (1000 = 10%)
  priorityFeeLamports: 100000,  // 优先级费用 (0.0001 SOL)
};

// ============ 辅助函数 ============
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string) {
  console.log(`❌ ${message}`);
}

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

// ============ 步骤1: 健康检查 ============
async function healthCheck() {
  logSection('Step 1: Health Check');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    logSuccess('API server is running');
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error: any) {
    logError(`API server is not running: ${error.message}`);
    logInfo('Please start the API server first: npm run api');
    return false;
  }
}

// ============ 步骤2: Quote询价 (Jupiter风格) ============
async function getQuote() {
  logSection('Step 2: Get Quote (Jupiter-style)');
  try {
    const isBuy = TEST_CONFIG.direction === 'buy';
    const inputMint = isBuy ? NATIVE_SOL_MINT : TEST_CONFIG.tokenMint;
    const outputMint = isBuy ? TEST_CONFIG.tokenMint : NATIVE_SOL_MINT;
    const amount = isBuy
      ? Math.floor(TEST_CONFIG.amountSol * LAMPORTS_PER_SOL).toString()
      : TEST_CONFIG.amountTokens.toString();

    const quoteRequest = {
      inputMint,
      outputMint,
      amount,
      slippageBps: TEST_CONFIG.slippageBps,
      market: TEST_CONFIG.market
    };

    logInfo('Quote Request:');
    console.log(JSON.stringify(quoteRequest, null, 2));

    const response = await axios.post(`${API_BASE_URL}/quote`, quoteRequest);
    const quote = response.data;

    logSuccess('Quote retrieved successfully');
    console.log(`   Input: ${quote.inAmount} (${isBuy ? 'lamports' : 'tokens'})`);
    console.log(`   Expected Output: ${quote.outAmount} (${isBuy ? 'tokens' : 'lamports'})`);
    console.log(`   Min Output (with slippage): ${quote.otherAmountThreshold}`);
    console.log(`   Slippage: ${quote.slippageBps / 100}%`);
    console.log(`   Market: ${quote.market}`);
    console.log(`   Swap Mode: ${quote.swapMode}`);

    return quote;
  } catch (error: any) {
    logError(`Quote error: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      console.log('   Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// ============ 步骤3: Swap构建交易 (Jupiter风格) ============
async function buildSwapTransaction(quoteResponse: any, wallet: Keypair) {
  logSection('Step 3: Build Swap Transaction');
  try {
    const swapRequest = {
      quoteResponse,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapUnwrapSOL: true,
      priorityFeeLamports: TEST_CONFIG.priorityFeeLamports
    };

    logInfo('Swap Request:');
    console.log(`   User: ${swapRequest.userPublicKey}`);
    console.log(`   Priority Fee: ${swapRequest.priorityFeeLamports} lamports`);

    const response = await axios.post(`${API_BASE_URL}/swap`, swapRequest);
    const { swapTransaction, lastValidBlockHeight } = response.data;

    logSuccess('Swap transaction built successfully');
    console.log(`   Transaction size: ${swapTransaction.length} bytes (base64)`);
    console.log(`   Last valid block height: ${lastValidBlockHeight}`);

    return { swapTransaction, lastValidBlockHeight };
  } catch (error: any) {
    logError(`Swap error: ${error.response?.data?.error || error.message}`);
    if (error.response?.data?.stack) {
      console.log('   Stack trace:', error.response.data.stack);
    }
    return null;
  }
}

// ============ 步骤4: 签名交易 ============
async function signTransaction(transactionBase64: string, wallet: Keypair) {
  logSection('Step 4: Sign Transaction');
  try {
    // 从base64解码交易
    const txBuffer = Buffer.from(transactionBase64, 'base64');
    const transaction = Transaction.from(txBuffer);

    logInfo(`Transaction before signing:`);
    console.log(`   Fee payer: ${transaction.feePayer?.toBase58()}`);
    console.log(`   Recent blockhash: ${transaction.recentBlockhash}`);
    console.log(`   Instructions: ${transaction.instructions.length}`);
    console.log(`   Signatures: ${transaction.signatures.length}`);

    // 签名交易
    transaction.sign(wallet);

    logSuccess('Transaction signed successfully');
    const signature = transaction.signatures[0].signature;
    if (signature) {
      console.log(`   Signature: ${bs58.encode(signature)}`);
    }

    return transaction;
  } catch (error: any) {
    logError(`Sign error: ${error.message}`);
    console.log('   Error details:', error);
    return null;
  }
}

// ============ 步骤5: 提交上链 ============
async function submitTransaction(transaction: Transaction, connection: Connection) {
  logSection('Step 5: Submit Transaction');
  try {
    logInfo('Sending transaction to blockchain...');

    // 序列化已签名的交易
    const rawTransaction = transaction.serialize();
    logInfo(`Serialized transaction size: ${rawTransaction.length} bytes`);

    // 发送交易
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });

    logInfo(`Transaction sent: ${signature}`);
    logInfo('Waiting for confirmation...');

    // 等待交易确认
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed');

    logSuccess('Transaction confirmed!');
    console.log(`   Signature: ${signature}`);
    console.log(`   Explorer: https://solscan.io/tx/${signature}`);
    return signature;
  } catch (error: any) {
    logError(`Submit error: ${error.message}`);
    if (error.logs) {
      console.log('   Transaction logs:');
      error.logs.forEach((log: string) => console.log(`     ${log}`));
    }
    return null;
  }
}

// ============ 主测试流程 ============
async function main() {
  console.log('\n🧪 Solana Trade API Test (Jupiter-style)\n');

  // 验证环境变量
  if (!RPC_URL) {
    logError('RPC_URL not configured in .env file');
    process.exit(1);
  }

  if (!PRIVATE_KEY) {
    logError('PRIVATE_KEY not configured in .env file');
    process.exit(1);
  }

  // 初始化连接和钱包
  let wallet: Keypair;
  try {
    wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
    logInfo(`Wallet: ${wallet.publicKey.toBase58()}`);
  } catch (error) {
    logError('Invalid PRIVATE_KEY format. Must be base58 encoded.');
    process.exit(1);
  }

  const connection = new Connection(RPC_URL, 'confirmed');

  // 检查余额
  try {
    const balance = await connection.getBalance(wallet.publicKey);
    logInfo(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    if (balance < 0.001 * LAMPORTS_PER_SOL) {
      logError('Insufficient balance. Need at least 0.001 SOL for testing.');
      process.exit(1);
    }
  } catch (error: any) {
    logError(`Failed to fetch balance: ${error.message}`);
    process.exit(1);
  }

  console.log('\n📋 Test Configuration:');
  console.log(JSON.stringify(TEST_CONFIG, null, 2));

  // 执行测试流程
  let success = true;

  // Step 1: Health Check
  if (!await healthCheck()) {
    process.exit(1);
  }
  await sleep(500);

  // Step 2: Get Quote
  const quote = await getQuote();
  if (!quote) {
    logError('Failed to get quote. Exiting.');
    process.exit(1);
  }
  await sleep(500);

  // Step 3: Build Swap Transaction
  const swapResult = await buildSwapTransaction(quote, wallet);
  if (!swapResult) {
    logError('Failed to build swap transaction. Exiting.');
    process.exit(1);
  }
  await sleep(500);

  // Step 4: Sign Transaction
  const signedTx = await signTransaction(swapResult.swapTransaction, wallet);
  if (!signedTx) {
    logError('Failed to sign transaction. Exiting.');
    process.exit(1);
  }
  await sleep(500);

  // Step 5: Submit Transaction
  logInfo('⚠️  About to submit transaction to blockchain');
  logInfo('⚠️  This will execute a real trade!');
  logInfo('⚠️  Press Ctrl+C to cancel, or wait 3 seconds to continue...');
  await sleep(3000);

  const signature = await submitTransaction(signedTx, connection);
  if (!signature) {
    success = false;
  }

  // 总结
  logSection('Test Summary');
  if (success) {
    logSuccess('All tests passed! ✨');
    console.log('\n📊 Complete flow verified:');
    console.log('   1. ✅ Health check');
    console.log('   2. ✅ Quote retrieval (Jupiter-style)');
    console.log('   3. ✅ Swap transaction building');
    console.log('   4. ✅ Transaction signing');
    console.log('   5. ✅ On-chain submission');
  } else {
    logError('Some tests failed. Please check the logs above.');
    process.exit(1);
  }
}

// 运行测试
main().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
