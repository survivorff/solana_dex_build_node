# 🚀 快速开始指南

## 第一步：安装依赖

```bash
npm install
```

## 第二步：配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑 .env 文件
nano .env
```

**必填配置：**

```bash
# RPC 端点（推荐使用 Helius 或 QuickNode）
RPC_URL=https://api.mainnet-beta.solana.com

# 你的钱包私钥（base58 格式）
PRIVATE_KEY=your-base58-private-key-here

# API 端口
API_PORT=3000
```

**如何获取私钥：**
- Phantom 钱包：Settings -> Export Private Key
- Solana CLI: `solana-keygen recover -o key.json`

## 第三步：启动 API 服务

```bash
# 启动服务
npm run api

# 或使用开发模式（自动重启）
npm run api:dev
```

看到以下输出表示成功：

```
🚀 Solana Trade API Server running on port 3000
📖 API Endpoints:
   GET  /health               - Health check
   POST /api/v1/quote         - Get token price
   POST /api/v1/build         - Build transaction
```

## 第四步：测试 API

### 方式 1：使用 curl 测试

```bash
# 健康检查
curl http://localhost:3000/health

# 获取价格
curl -X POST http://localhost:3000/api/v1/quote \
  -H "Content-Type: application/json" \
  -d '{
    "market": "PUMP_FUN",
    "mint": "YourTokenMintAddress",
    "unit": "SOL"
  }'
```

### 方式 2：运行完整测试脚本

1. **编辑测试配置** - 打开 `test-api-flow.ts` 文件：

```typescript
const TEST_CONFIG = {
  market: 'PUMP_FUN',
  mint: 'TokenMintAddressHere',  // 🔑 替换为实际代币地址
  direction: 'buy',
  amount: 0.01,  // 小额测试
  slippage: 10,
  priorityFeeSol: 0.0001
};
```

2. **运行测试：**

```bash
npm run test:api
```

测试会依次执行：
- ✅ 健康检查
- ✅ Quote 询价
- ✅ Build 交易
- ✅ Sign 签名
- ✅ Submit 上链

## 完整流程示例

```typescript
import axios from 'axios';
import { Connection, Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

const API_BASE_URL = 'http://localhost:3000';

async function quickTrade() {
  // 1. 询价
  const quoteResponse = await axios.post(`${API_BASE_URL}/api/v1/quote`, {
    market: 'PUMP_FUN',
    mint: 'TokenMintAddress',
    unit: 'SOL'
  });
  console.log('Price:', quoteResponse.data.data.price, 'SOL');

  // 2. 构建交易
  const buildResponse = await axios.post(`${API_BASE_URL}/api/v1/build`, {
    market: 'PUMP_FUN',
    direction: 'buy',
    wallet: 'YourWalletPublicKey',
    mint: 'TokenMintAddress',
    amount: 0.01,
    slippage: 10
  });

  // 3. 签名交易
  const txBuffer = Buffer.from(buildResponse.data.data.transaction, 'base64');
  const transaction = Transaction.from(txBuffer);
  const wallet = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));
  transaction.sign(wallet);

  // 4. 提交上链
  const connection = new Connection(process.env.RPC_URL!, 'confirmed');
  const signature = await connection.sendRawTransaction(transaction.serialize());
  console.log('Signature:', signature);
  console.log('Explorer:', `https://solscan.io/tx/${signature}`);
}
```

## 常见问题

### Q: API 启动失败？

**检查：**
```bash
# 检查端口占用
lsof -i :3000

# 检查依赖
npm install

# 检查环境变量
cat .env
```

### Q: 交易构建失败？

**检查：**
- RPC_URL 是否配置正确
- 代币地址是否有效
- 余额是否充足

### Q: 如何测试不同市场？

修改 TEST_CONFIG 中的 market 字段：

```typescript
market: 'RAYDIUM_CPMM'  // 或其他支持的市场
```

**支持的市场：**
- PUMP_FUN
- PUMP_SWAP
- RAYDIUM_AMM
- RAYDIUM_CLMM
- RAYDIUM_CPMM
- ORCA_WHIRLPOOL
- METEORA_DLMM
- 等 15+ 市场

## 下一步

查看完整文档：
- [API_GUIDE.md](./API_GUIDE.md) - 详细 API 文档
- [README.md](./README.md) - 项目说明

## 安全提示

⚠️ **重要：**
1. 永远不要提交 `.env` 文件到 Git
2. 使用小额测试后再进行大额交易
3. 测试和生产使用不同的钱包
4. 保护好你的私钥

---

有问题？查看 [API_GUIDE.md](./API_GUIDE.md) 获取更多帮助！
