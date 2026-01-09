import express from 'express';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { SolanaTrade } from './trader';
import { buildTransaction } from './builder';
import bs58 from 'bs58';

const app = express();
app.use(express.json());

// 初始化trader实例
const trader = new SolanaTrade(process.env.RPC_URL);

// ============ 1. Quote 询价接口 ============
app.post('/api/v1/quote', async (req, res) => {
  try {
    const { market, mint, unit = 'SOL' } = req.body;

    // 参数验证
    if (!market || !mint) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: market, mint'
      });
    }

    // 调用价格查询
    const result = await trader.price({
      market,
      mint,
      unit: unit as 'SOL' | 'LAMPORTS'
    });

    res.json({
      success: true,
      data: {
        market,
        mint,
        price: result.price,
        unit,
        bondingCurvePercent: result.bondingCurvePercent,
        timestamp: Date.now()
      }
    });
  } catch (error: any) {
    console.error('Quote error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ 2. Build 交易编码接口 ============
app.post('/api/v1/build', async (req, res) => {
  try {
    const {
      market,
      direction,  // 'buy' or 'sell'
      wallet,     // PublicKey string
      mint,
      amount,
      slippage,
      priorityFeeSol,
      tipAmountSol,
      poolAddress,
      sender,
      antimev,
      region,
      skipSimulation
    } = req.body;

    // 验证必填参数
    if (!market || !direction || !wallet || !mint || amount === undefined || slippage === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: market, direction, wallet, mint, amount, slippage'
      });
    }

    // 用户的公钥
    const userPublicKey = new PublicKey(wallet);

    // 获取连接
    const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

    // 直接调用 buildTransaction 构建交易
    // 传入一个只包含 publicKey 的对象（不需要完整的 Keypair）
    const transaction = await buildTransaction({
      connection,
      market,
      direction,
      wallet: { publicKey: userPublicKey },
      mint: new PublicKey(mint),
      amount: Number(amount),
      slippage: Number(slippage) / 100,  // 转换为小数
      priorityFeeSol: priorityFeeSol ? Number(priorityFeeSol) : undefined,
      poolAddress: poolAddress ? new PublicKey(poolAddress) : undefined,
      additionalInstructions: undefined
    });

    // 获取最新的 blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;

    // 序列化交易（未签名）
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');

    // 解析指令详情（用于调试和验证）
    const instructions = transaction.instructions.map((ix, index) => ({
      programId: ix.programId.toBase58(),
      accounts: ix.keys.map(key => ({
        pubkey: key.pubkey.toBase58(),
        isSigner: key.isSigner,
        isWritable: key.isWritable
      })),
      dataLength: ix.data.length,
      index
    }));

    res.json({
      success: true,
      data: {
        // 交易编码（base64格式，可直接用于签名）
        transaction: serialized,

        // 交易元数据
        feePayer: userPublicKey.toBase58(),
        recentBlockhash: blockhash,
        lastValidBlockHeight,

        // 指令信息
        instructionCount: transaction.instructions.length,
        instructions,

        // 时间戳
        timestamp: Date.now()
      }
    });
  } catch (error: any) {
    console.error('Build error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============ 3. 增强Quote接口：计算交易输出（简化版） ============
app.post('/api/v1/quote/swap', async (req, res) => {
  try {
    const { market, direction, mint, inputAmount, slippage = 5 } = req.body;

    if (!market || !direction || !mint || !inputAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: market, direction, mint, inputAmount'
      });
    }

    // 获取价格
    const priceData = await trader.price({
      market,
      mint,
      unit: 'SOL'
    });

    let quote: any;

    if (direction === 'buy') {
      // 买：输入SOL，输出Token
      const outputTokens = inputAmount / priceData.price;
      const slippageFactor = 1 - (slippage / 100);
      const minimumReceived = outputTokens * slippageFactor;

      quote = {
        direction: 'buy',
        inputAmount,
        inputUnit: 'SOL',
        outputAmount: outputTokens,
        outputUnit: 'TOKENS',
        minimumReceived,
        spotPrice: priceData.price,
        slippage
      };
    } else if (direction === 'sell') {
      // 卖：输入Token，输出SOL
      const outputSol = inputAmount * priceData.price;
      const slippageFactor = 1 - (slippage / 100);
      const minimumReceived = outputSol * slippageFactor;

      quote = {
        direction: 'sell',
        inputAmount,
        inputUnit: 'TOKENS',
        outputAmount: outputSol,
        outputUnit: 'SOL',
        minimumReceived,
        spotPrice: priceData.price,
        slippage
      };
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid direction'
      });
    }

    res.json({
      success: true,
      data: {
        market,
        mint,
        bondingCurvePercent: priceData.bondingCurvePercent,
        ...quote,
        timestamp: Date.now(),
        note: 'This is a simplified calculation. Actual output may vary based on pool liquidity and AMM curve.'
      }
    });
  } catch (error: any) {
    console.error('Quote swap error:', error);
    res.status(500).json({
      success: false,
      error: error.message
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
app.get('/api/v1/markets', (req, res) => {
  res.json({
    success: true,
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

// ============ API文档 ============
app.get('/', (req, res) => {
  res.json({
    name: 'Solana Trade API',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'GET /api/v1/markets': 'List supported markets',
      'POST /api/v1/quote': 'Get token price',
      'POST /api/v1/quote/swap': 'Get swap quote with slippage',
      'POST /api/v1/build': 'Build transaction (returns base64 encoded transaction)'
    },
    documentation: 'https://github.com/FlorianMgs/solana-trade'
  });
});

// 启动服务器
const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Solana Trade API Server running on port ${PORT}`);
  console.log(`📖 API Endpoints:`);
  console.log(`   GET  /                     - API documentation`);
  console.log(`   GET  /health               - Health check`);
  console.log(`   GET  /api/v1/markets       - List supported markets`);
  console.log(`   POST /api/v1/quote         - Get token price`);
  console.log(`   POST /api/v1/quote/swap    - Get swap quote`);
  console.log(`   POST /api/v1/build         - Build transaction`);
  console.log(`\n⚙️  Configuration:`);
  console.log(`   RPC_URL: ${process.env.RPC_URL || 'default (mainnet-beta)'}`);
  console.log(`   API_PORT: ${PORT}\n`);
});

export default app;
