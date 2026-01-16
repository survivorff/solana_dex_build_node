# Solana DEX 交易打包服务

一个功能完善的 Solana DEX 交易打包服务，支持 15+ 主流 DEX，提供 Jupiter 风格的 API 接口。适用于交易机器人、DApp 集成等场景。

## 功能特性

- 🏪 **支持 15+ DEX**: Pump.fun、PumpSwap、Raydium (AMM/CLMM/CPMM/Launchpad)、Orca、Meteora (DLMM/DAMM/DBC)、Moonit、Heaven、Sugar、Boop.fun
- 🛡️ **MEV 保护**: 支持 Jito、Nozomi、Astralane 等 MEV 保护服务
- ⚡ **高性能**: 优化的交易构建流程，自动池发现
- 🎯 **Jupiter 风格 API**: 熟悉的 quote/swap 接口设计
- 💻 **双接口**: 完整的编程 API + 强大的 CLI 工具
- 📦 **TypeScript**: 完整的类型定义
- 🔧 **可配置**: 丰富的自定义选项
- 📊 **交易控制**: 优先级费用、滑点保护、模拟控制

## 支持的市场

| 协议 | 市场标识符 |
|------|-----------|
| Pump.fun | `PUMP_FUN` |
| Pump Swap | `PUMP_SWAP` |
| Raydium AMM | `RAYDIUM_AMM` |
| Raydium CLMM | `RAYDIUM_CLMM` |
| Raydium CPMM | `RAYDIUM_CPMM` |
| Raydium Launchpad | `RAYDIUM_LAUNCHPAD` |
| Orca Whirlpool | `ORCA_WHIRLPOOL` |
| Meteora DLMM | `METEORA_DLMM` |
| Meteora DAMM V1 | `METEORA_DAMM_V1` |
| Meteora DAMM V2 | `METEORA_DAMM_V2` |
| Meteora DBC | `METEORA_DBC` |
| Moonit | `MOONIT` |
| Heaven XYZ | `HEAVEN` |
| Sugar | `SUGAR` |
| Boop.fun | `BOOP_FUN` |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量模板并编辑：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下必填项：

```bash
# RPC 端点（推荐使用 Helius 或 QuickNode）
RPC_URL=https://api.mainnet-beta.solana.com

# 你的钱包私钥（base58 格式）
PRIVATE_KEY=your-base58-private-key-here

# API 服务端口
API_PORT=3000
```

### 3. 启动 API 服务

```bash
# 生产模式
npm run api

# 开发模式（自动重启）
npm run api:dev
```

服务启动后会显示：

```
🚀 Solana DEX Swap API Server running on port 3000
📖 API Endpoints:
   GET  /                     - API documentation
   GET  /health               - Health check
   GET  /markets              - List supported markets
   POST /quote                - Get swap quote
   POST /swap                 - Build swap transaction
```

## API 接口文档

### 1. 健康检查

**Endpoint:** `GET /health`

**响应：**
```json
{
  "status": "ok",
  "timestamp": 1704700800000,
  "rpcUrl": "https://api.mainnet-beta.solana.com"
}
```

### 2. 获取支持的市场

**Endpoint:** `GET /markets`

**响应：**
```json
{
  "markets": [
    "PUMP_FUN",
    "PUMP_SWAP",
    "RAYDIUM_AMM",
    "RAYDIUM_CLMM",
    ...
  ]
}
```

### 3. Quote 询价接口 (Jupiter 风格)

**Endpoint:** `POST /quote`

**请求体：**
```json
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "TokenMintAddressHere",
  "amount": "10000000",
  "slippageBps": 1000,
  "market": "PUMP_FUN",
  "poolAddress": "PoolAddressHere (可选)"
}
```

**参数说明：**
- `inputMint`: 输入代币地址（SOL 使用 `So11111111111111111111111111111111111111112`）
- `outputMint`: 输出代币地址
- `amount`: 输入数量（lamports 或 token 最小单位）
- `slippageBps`: 滑点（基点，1000 = 10%，50 = 0.5%）
- `market`: DEX 市场标识符
- `poolAddress`: 可选，指定池子地址

**响应：**
```json
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "TokenMintAddressHere",
  "inAmount": "10000000",
  "outAmount": "1234567890",
  "otherAmountThreshold": "1111111101",
  "swapMode": "ExactIn",
  "slippageBps": 1000,
  "priceImpactPct": "0",
  "market": "PUMP_FUN",
  "poolAddress": null,
  "contextSlot": 123456789,
  "timeTaken": 1704700800000
}
```

**响应字段说明：**
- `inAmount`: 输入数量（字符串）
- `outAmount`: 预期输出数量（字符串）
- `otherAmountThreshold`: 考虑滑点后的最小输出数量（字符串）
- `swapMode`: 交易模式（固定为 "ExactIn"）
- `priceImpactPct`: 价格影响百分比（简化版本为 "0"）

### 4. Swap 构建交易接口

**Endpoint:** `POST /swap`

**请求体：**
```json
{
  "quoteResponse": {
    "inputMint": "So11111111111111111111111111111111111111112",
    "outputMint": "TokenMintAddressHere",
    "inAmount": "10000000",
    "outAmount": "1234567890",
    "otherAmountThreshold": "1111111101",
    "swapMode": "ExactIn",
    "slippageBps": 1000,
    "priceImpactPct": "0",
    "market": "PUMP_FUN",
    "poolAddress": null
  },
  "userPublicKey": "YourWalletPublicKeyHere",
  "wrapUnwrapSOL": true,
  "priorityFeeLamports": 100000
}
```

**参数说明：**
- `quoteResponse`: 从 `/quote` 接口获取的完整响应
- `userPublicKey`: 用户钱包公钥
- `wrapUnwrapSOL`: 是否自动包装/解包装 SOL（保留字段）
- `priorityFeeLamports`: 优先级费用（lamports）

**响应：**
```json
{
  "swapTransaction": "base64EncodedTransactionHere...",
  "lastValidBlockHeight": 123456789
}
```

**响应字段说明：**
- `swapTransaction`: Base64 编码的未签名交易
- `lastValidBlockHeight`: 交易有效的最后区块高度

## 使用示例

### 完整的 Quote + Swap 流程

```typescript
import axios from 'axios';
import { Connection, Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

const API_BASE_URL = 'http://localhost:3000';
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

async function swapExample() {
  // 1. 获取 Quote
  const quoteRequest = {
    inputMint: NATIVE_SOL_MINT,
    outputMint: 'YourTokenMintHere',
    amount: '10000000',  // 0.01 SOL
    slippageBps: 1000,   // 10%
    market: 'PUMP_FUN'
  };

  const quoteResponse = await axios.post(`${API_BASE_URL}/quote`, quoteRequest);
  const quote = quoteResponse.data;

  console.log('Expected output:', quote.outAmount);
  console.log('Minimum output:', quote.otherAmountThreshold);

  // 2. 构建交易
  const wallet = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));

  const swapRequest = {
    quoteResponse: quote,
    userPublicKey: wallet.publicKey.toBase58(),
    priorityFeeLamports: 100000
  };

  const swapResponse = await axios.post(`${API_BASE_URL}/swap`, swapRequest);
  const { swapTransaction, lastValidBlockHeight } = swapResponse.data;

  // 3. 签名并发送交易
  const txBuffer = Buffer.from(swapTransaction, 'base64');
  const transaction = Transaction.from(txBuffer);
  transaction.sign(wallet);

  const connection = new Connection(process.env.RPC_URL!);
  const signature = await connection.sendRawTransaction(transaction.serialize());

  console.log('Transaction:', signature);
  console.log('Explorer:', `https://solscan.io/tx/${signature}`);
}
```

### 测试脚本

运行提供的测试脚本：

```bash
# 编辑 test-jupiter-api.ts 中的配置
npm run test:jupiter
```

## 与 Jupiter API 的对比

| 特性 | Jupiter | 本项目 |
|------|---------|--------|
| Quote 接口 | ✅ | ✅ |
| Swap 接口 | ✅ | ✅ |
| 路由聚合 | ✅ | ❌ (单池直接交易) |
| 多跳交易 | ✅ | ❌ |
| 价格影响计算 | ✅ | 简化版 |
| 支持 DEX 数量 | 20+ | 15+ |
| 指定池子交易 | ❌ | ✅ |

## 主要区别

1. **无路由聚合**: 本项目不进行路由聚合，直接在指定的 DEX 池子进行交易
2. **指定池子**: 支持通过 `poolAddress` 参数指定具体的池子地址
3. **简化的价格影响**: 不计算复杂的价格影响，适合流动性充足的池子
4. **单跳交易**: 仅支持单跳交易（A -> B），不支持多跳（A -> B -> C）

## CLI 工具

除了 API 接口，还提供命令行工具：

```bash
# 买入代币
npm run trade -- buy --market PUMP_FUN --mint TokenMintHere --amount 0.01 --slippage 10

# 卖出代币
npm run trade -- sell --market PUMP_FUN --mint TokenMintHere --amount 1000 --slippage 10

# 查询价格
npm run trade -- price --market PUMP_FUN --mint TokenMintHere
```

## 开发

```bash
# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 运行测试
npm test

# 启动开发服务器
npm run api:dev
```

## 注意事项

1. **RPC 限制**: 使用公共 RPC 可能有速率限制，建议使用 Helius 或 QuickNode
2. **私钥安全**: 永远不要将私钥提交到版本控制系统
3. **测试环境**: 建议先在 devnet 测试
4. **滑点设置**: 根据代币流动性合理设置滑点
5. **优先级费用**: 在网络拥堵时增加优先级费用
6. **平台手续费**: 买入交易时会自动收取平台手续费（如已配置）

## 平台手续费配置

本项目支持配置平台交易手续费，仅在买入交易时收取。

### 配置方法

在 `.env` 文件中添加以下配置：

```bash
# 平台手续费地址（不配置则不收取手续费）
PLATFORM_FEE_ADDRESS=YourPlatformFeeAddressHere

# 平台手续费比例（不配置则默认 1%）
PLATFORM_FEE_RATE=0.01
```

### 说明

- **PLATFORM_FEE_ADDRESS**: 平台手续费接收地址
  - 如果不配置此地址，则不会收取任何手续费
  - 必须是有效的 Solana 公钥地址

- **PLATFORM_FEE_RATE**: 手续费比例
  - 默认值：0.01（1%）
  - 范围：0.0001 - 0.1（0.01% - 10%）
  - 手续费 = 买入金额 × 手续费比例

### 示例

```bash
# 配置 1% 手续费
PLATFORM_FEE_ADDRESS=YourAddressHere
PLATFORM_FEE_RATE=0.01

# 配置 0.5% 手续费
PLATFORM_FEE_ADDRESS=YourAddressHere
PLATFORM_FEE_RATE=0.005

# 不收取手续费（不配置地址）
# PLATFORM_FEE_ADDRESS=
```

### 手续费计算

- 买入 0.1 SOL，手续费比例 1%：手续费 = 0.001 SOL
- 买入 1 SOL，手续费比例 0.5%：手续费 = 0.005 SOL
- 卖出交易：不收取手续费

## 📚 技术文档

完整的技术文档请查看 [docs](./docs/) 目录:

- **[设计文档](./docs/DESIGN.md)** - 项目背景、架构设计、核心功能
- **[核心设计 - Quote 计算](./docs/CORE_DESIGN_QUOTE.md)** - Quote 计算系统详细设计
- **[API 交付文档](./docs/API_DELIVERY.md)** - 完整 API 接口规范与使用示例
- **[运维部署文档](./docs/DEPLOYMENT.md)** - 环境配置、部署、监控运维
- **[测试文档](./docs/TESTING.md)** - 测试策略、测试用例、自测代码

更多参考文档请查看 [docs/README.md](./docs/README.md)

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
