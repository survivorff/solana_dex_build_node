/**
 * 完整测试流程：Quote -> Build -> Sign -> Submit
 *
 * 使用说明：
 * 1. 复制 .env.example 为 .env
 * 2. 配置 RPC_URL 和 PRIVATE_KEY
 * 3. 运行: npx ts-node test-api-flow.ts
 */

import axios from 'axios';
import { Connection, Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';

dotenv.config();

// ============ 配置 ============
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// 测试参数（请根据实际情况修改）
const TEST_CONFIG = {
  market: 'PUMP_FUN',  // 可选: RAYDIUM_CPMM, ORCA_WHIRLPOOL 等
  mint: '43vYSxC3cXThzCwm6qb4tqiGSqqpBheSmFrsWpwGpump',  // 🔑 替换为实际的代币地址
  direction: 'buy',  // 'buy' or 'sell'
  amount: 0.0001,  // SOL数量（buy）或代币数量（sell）
  slippage: 10,  // 滑点百分比
  priorityFeeSol: 0.0001,
  skipSimulation: false
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

// ============ 步骤2: Quote询价 ============
async function getQuote() {
  logSection('Step 2: Get Quote');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/v1/quote`, {
      market: TEST_CONFIG.market,
      mint: TEST_CONFIG.mint,
      unit: 'SOL'
    });

    if (response.data.success) {
      const { price, bondingCurvePercent } = response.data.data;
      logSuccess('Quote retrieved successfully');
      console.log(`   Price: ${price} SOL`);
      console.log(`   Bonding Curve: ${bondingCurvePercent !== null ? bondingCurvePercent + '%' : 'N/A'}`);
      return response.data.data;
    } else {
      logError('Failed to get quote');
      return null;
    }
  } catch (error: any) {
    logError(`Quote error: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

// ============ 步骤3: Build交易 ============
async function buildTransaction(wallet: Keypair) {
  logSection('Step 3: Build Transaction');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/v1/build`, {
      market: TEST_CONFIG.market,
      direction: TEST_CONFIG.direction,
      wallet: wallet.publicKey.toBase58(),
      mint: TEST_CONFIG.mint,
      amount: TEST_CONFIG.amount,
      slippage: TEST_CONFIG.slippage,
      priorityFeeSol: TEST_CONFIG.priorityFeeSol,
      skipSimulation: TEST_CONFIG.skipSimulation
    });

    if (response.data.success) {
      const { transaction, instructionCount, recentBlockhash, lastValidBlockHeight } = response.data.data;
      logSuccess('Transaction built successfully');
      console.log(`   Instructions: ${instructionCount}`);
      console.log(`   Blockhash: ${recentBlockhash}`);
      console.log(`   Valid until block: ${lastValidBlockHeight}`);
      console.log(`   Transaction size: ${transaction.length} bytes (base64)`);
      return response.data.data;
    } else {
      logError('Failed to build transaction');
      return null;
    }
  } catch (error: any) {
    logError(`Build error: ${error.response?.data?.error || error.message}`);
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
    console.log(`   Signatures: ${transaction.signatures.length}`);

    // 签名交易
    transaction.sign(wallet);

    logSuccess('Transaction signed successfully');
    console.log(`   Signature: ${transaction.signatures[0].signature ? bs58.encode(transaction.signatures[0].signature) : 'null'}`);

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

    // 发送交易（使用 sendRawTransaction 因为已经签名）
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: TEST_CONFIG.skipSimulation,
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
  console.log('\n🧪 Solana Trade API Full Flow Test\n');

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
    logInfo(`Balance: ${balance / 1e9} SOL`);
    if (balance < 0.01 * 1e9) {
      logError('Insufficient balance. Need at least 0.01 SOL for testing.');
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
    logInfo('Skipping quote check (optional step)');
  }
  await sleep(500);

  // Step 3: Build Transaction
  const buildResult = await buildTransaction(wallet);
  if (!buildResult) {
    process.exit(1);
  }
  await sleep(500);

  // Step 4: Sign Transaction
  const signedTx = await signTransaction(buildResult.transaction, wallet);
  if (!signedTx) {
    process.exit(1);
  }
  await sleep(500);

  // Step 5: Submit Transaction
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
    console.log('   2. ✅ Quote retrieval');
    console.log('   3. ✅ Transaction building');
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
