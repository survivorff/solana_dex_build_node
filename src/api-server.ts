import express from 'express';
import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolanaTrade } from './trader';
import { buildTransaction } from './builder';

const app = express();
app.use(express.json());

const trader = new SolanaTrade(process.env.RPC_URL);
const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

// Native SOL mint address
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

// ============ Quote 接口 (仿照 Jupiter) ============
app.post('/quote', async (req, res) => {
  try {
    const {
      inputMint,
      outputMint,
      amount,
      slippageBps = 50, // 默认 0.5%
      market,
      poolAddress
    } = req.body;

    // 参数验证
    if (!inputMint || !outputMint || !amount || !market) {
      return res.status(400).json({
        error: 'Missing required fields: inputMint, outputMint, amount, market'
      });
    }

    // 确定交易方向
    const isBuy = inputMint === NATIVE_SOL_MINT;
    const tokenMint = isBuy ? outputMint : inputMint;

    // 获取价格信息
    const priceData = await trader.price({
      market,
      mint: tokenMint,
      unit: 'LAMPORTS'
    });

    // 计算输入输出数量
    let inAmount: number;
    let outAmount: number;
    let priceImpactPct = 0; // 简化版本，实际应该根据池子流动性计算

    if (isBuy) {
      // 买入：输入 SOL，输出 Token
      inAmount = Number(amount);
      outAmount = Math.floor(inAmount / priceData.price);
    } else {
      // 卖出：输入 Token，输出 SOL
      inAmount = Number(amount);
      outAmount = Math.floor(inAmount * priceData.price);
    }

    // 计算滑点保护的最小输出
    const slippageDecimal = Number(slippageBps) / 10000;
    const otherAmountThreshold = Math.floor(outAmount * (1 - slippageDecimal));

    const quoteResponse = {
      inputMint,
      outputMint,
      inAmount: inAmount.toString(),
      outAmount: outAmount.toString(),
      otherAmountThreshold: otherAmountThreshold.toString(),
      swapMode: 'ExactIn',
      slippageBps: Number(slippageBps),
      priceImpactPct: priceImpactPct.toString(),
      market,
      poolAddress: poolAddress || null,
      contextSlot: await connection.getSlot(),
      timeTaken: Date.now()
    };

    res.json(quoteResponse);
  } catch (error: any) {
    console.error('Quote error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// ============ Swap 接口 (根据 quote 构建交易) ============
app.post('/swap', async (req, res) => {
  try {
    const {
      quoteResponse,
      userPublicKey,
      wrapUnwrapSOL = true,
      priorityFeeLamports,
      dynamicComputeUnitLimit = false
    } = req.body;

    // 参数验证
    if (!quoteResponse || !userPublicKey) {
      return res.status(400).json({
        error: 'Missing required fields: quoteResponse, userPublicKey'
      });
    }

    const {
      inputMint,
      outputMint,
      inAmount,
      slippageBps,
      market,
      poolAddress
    } = quoteResponse;

    // 确定交易方向和数量
    const isBuy = inputMint === NATIVE_SOL_MINT;
    const tokenMint = isBuy ? outputMint : inputMint;
    const amount = isBuy
      ? Number(inAmount) / LAMPORTS_PER_SOL  // SOL 数量
      : Number(inAmount);  // Token 数量

    const userPubkey = new PublicKey(userPublicKey);

    // 构建交易
    const transaction = await buildTransaction({
      connection,
      market,
      direction: isBuy ? 'buy' : 'sell',
      wallet: { publicKey: userPubkey },
      mint: new PublicKey(tokenMint),
      amount,
      slippage: Number(slippageBps) / 10000,
      priorityFeeSol: priorityFeeLamports ? priorityFeeLamports / LAMPORTS_PER_SOL : 0.0001,
      poolAddress: poolAddress ? new PublicKey(poolAddress) : undefined,
      additionalInstructions: undefined
    });

    // 获取最新的 blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPubkey;

    // 序列化交易（未签名）
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');

    res.json({
      swapTransaction: serialized,
      lastValidBlockHeight
    });
  } catch (error: any) {
    console.error('Swap error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============ 健康检查 ============
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    rpcUrl: process.env.RPC_URL || 'default'
  });
});

// ============ 支持的市场列表 ============
app.get('/markets', (req, res) => {
  res.json({
    markets: [
      'PUMP_FUN',
      'PUMP_SWAP',
      'RAYDIUM_AMM',
      'RAYDIUM_CLMM',
      'RAYDIUM_CPMM',
      'RAYDIUM_LAUNCHPAD',
      'ORCA_WHIRLPOOL',
      'METEORA_DLMM',
      'METEORA_DAMM_V1',
      'METEORA_DAMM_V2',
      'METEORA_DBC',
      'MOONIT',
      'HEAVEN',
      'SUGAR',
      'BOOP_FUN'
    ]
  });
});

// ============ API 文档 ============
app.get('/', (req, res) => {
  res.json({
    name: 'Solana DEX Swap API',
    version: '2.0.0',
    description: 'Jupiter-style API for Solana DEX trading',
    endpoints: {
      'GET /health': 'Health check',
      'GET /markets': 'List supported markets',
      'POST /quote': 'Get swap quote (Jupiter-style)',
      'POST /swap': 'Build swap transaction from quote'
    },
    documentation: 'https://github.com/survivorff/solana_dex_node'
  });
});

// 启动服务器
const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Solana DEX Swap API Server running on port ${PORT}`);
  console.log(`📖 API Endpoints:`);
  console.log(`   GET  /                     - API documentation`);
  console.log(`   GET  /health               - Health check`);
  console.log(`   GET  /markets              - List supported markets`);
  console.log(`   POST /quote                - Get swap quote`);
  console.log(`   POST /swap                 - Build swap transaction`);
  console.log(`\n⚙️  Configuration:`);
  console.log(`   RPC_URL: ${process.env.RPC_URL || 'default (mainnet-beta)'}`);
  console.log(`   API_PORT: ${PORT}\n`);
});

export default app;
