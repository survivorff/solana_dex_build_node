import { Connection, PublicKey } from '@solana/web3.js';
import { getPumpFunAccurateQuoteNative } from '../../src/markets/pump-fun/quote-native';
import { getPumpSwapAccurateQuoteNative } from '../../src/markets/pump-swap/quote-native';
import { getRaydiumCpmmAccurateQuoteNative } from '../../src/markets/raydium-cpmm/quote-native';

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL);

const WSOL = 'So11111111111111111111111111111111111111112';

async function testPumpFunNative() {
  console.log('\n🧪 Testing PumpFun Native Implementation\n');

  try {
    const tokenMint = 'GR4coNWJAAw1N1fLNLQ2J9xufq4NUYkDeKhtnvMhpump'; // 替换为实际的 token mint

    const result = await getPumpFunAccurateQuoteNative(connection, {
      inputMint: new PublicKey(WSOL),
      outputMint: new PublicKey(tokenMint),
      amount: '10000000', // 0.01 SOL
      slippageBps: 100,
    });

    console.log('✅ PumpFun Native Quote:');
    console.log('  Input:', result.inAmount);
    console.log('  Output:', result.outAmount);
    console.log('  Min Output:', result.otherAmountThreshold);
    console.log('  Price Impact:', result.priceImpactPct + '%');
    console.log('  Fee:', result.fees.tradeFee);
    console.log('  Pool:', result.poolInfo.poolAddress);
  } catch (error: any) {
    console.error('❌ PumpFun Native Error:', error.message);
  }
}

async function testPumpSwapNative() {
  console.log('\n🧪 Testing PumpSwap Native Implementation\n');

  try {
    const tokenMint = 'YOUR_PUMPSWAP_TOKEN_MINT'; // 替换为实际的 token mint

    const result = await getPumpSwapAccurateQuoteNative(connection, {
      inputMint: new PublicKey(WSOL),
      outputMint: new PublicKey(tokenMint),
      amount: '10000000', // 0.01 SOL
      slippageBps: 100,
    });

    console.log('✅ PumpSwap Native Quote:');
    console.log('  Input:', result.inAmount);
    console.log('  Output:', result.outAmount);
    console.log('  Min Output:', result.otherAmountThreshold);
    console.log('  Price Impact:', result.priceImpactPct + '%');
    console.log('  Trade Fee:', result.fees.tradeFee);
    console.log('  Protocol Fee:', result.fees.protocolFee);
    console.log('  Pool:', result.poolInfo.poolAddress);
  } catch (error: any) {
    console.error('❌ PumpSwap Native Error:', error.message);
  }
}

async function testRaydiumCpmmNative() {
  console.log('\n🧪 Testing Raydium CPMM Native Implementation\n');

  try {
    const poolAddress = '61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht'; // 示例池子地址

    const result = await getRaydiumCpmmAccurateQuoteNative(connection, {
      inputMint: new PublicKey(WSOL),
      outputMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
      amount: '10000000', // 0.01 SOL
      slippageBps: 100,
      poolAddress: new PublicKey(poolAddress),
    });

    console.log('✅ Raydium CPMM Native Quote:');
    console.log('  Input:', result.inAmount);
    console.log('  Output:', result.outAmount);
    console.log('  Min Output:', result.otherAmountThreshold);
    console.log('  Price Impact:', result.priceImpactPct + '%');
    console.log('  Trade Fee:', result.fees.tradeFee);
    console.log('  Protocol Fee:', result.fees.protocolFee);
    console.log('  Pool:', result.poolInfo.poolAddress);
  } catch (error: any) {
    console.error('❌ Raydium CPMM Native Error:', error.message);
  }
}

async function main() {
  console.log('🚀 Testing Native Quote Implementations\n');
  console.log('RPC URL:', RPC_URL);
  console.log('=' .repeat(60));

  await testPumpFunNative();
  await testPumpSwapNative();
  await testRaydiumCpmmNative();

  console.log('\n' + '='.repeat(60));
  console.log('✅ All native tests completed!\n');
}

main().catch(console.error);
