# Solana Trade API 服务指南

## 概述

本项目已扩展为支持 REST API 服务，提供以下功能：

1. **Quote 询价接口** - 查询代币实时价格
2. **Build 交易编码接口** - 构建未签名的交易
3. **完整上链测试** - 验证 Quote -> Build -> Sign -> Submit 完整流程

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下必填项：

```bash
# 必填：RPC 端点
RPC_URL=https://api.mainnet-beta.solana.com

# 必填：你的钱包私钥（base58格式）
PRIVATE_KEY=your-base58-private-key-here

# 可选：API 服务端口
API_PORT=3000
```

**获取私钥：**
- Phantom 钱包：Settings -> Export Private Key
- Solana CLI: `solana-keygen recover -o key.json`

### 3. 启动 API 服务

```bash
# 生产模式
npm run api

# 开发模式（自动重启）
npm run api:dev
```

服务启动后会显示：

```
🚀 Solana Trade API Server running on port 3000
📖 API Endpoints:
   GET  /                     - API documentation
   GET  /health               - Health check
   GET  /api/v1/markets       - List supported markets
   POST /api/v1/quote         - Get token price
   POST /api/v1/quote/swap    - Get swap quote
   POST /api/v1/build         - Build transaction
```

### 4. 运行完整测试

编辑 `test-api-flow.ts` 中的测试配置：

```typescript
const TEST_CONFIG = {
  market: 'PUMP_FUN',  // 市场类型
  mint: 'TokenMintAddressHere',  // 🔑 替换为实际代币地址
  direction: 'buy',  // 'buy' or 'sell'
  amount: 0.01,  // 买入的 SOL 数量
  slippage: 10,  // 滑点百分比
  priorityFeeSol: 0.0001
};
```

运行测试：

```bash
npm run test:api
```

测试流程会依次执行：
1. ✅ 健康检查
2. ✅ Quote 询价
3. ✅ Build 交易编码
4. ✅ Sign 签名交易
5. ✅ Submit 提交上链

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

### 2. 支持的市场列表

**Endpoint:** `GET /api/v1/markets`

**响应：**
```json
{
  "success": true,
  "markets": [
    "PUMP_FUN",
    "RAYDIUM_CPMM",
    "ORCA_WHIRLPOOL",
    "METEORA_DLMM",
    ...
  ]
}
```

### 3. Quote 询价

**Endpoint:** `POST /api/v1/quote`

**请求体：**
```json
{
  "market": "PUMP_FUN",
  "mint": "TokenMintAddress",
  "unit": "SOL"  // 可选: "SOL" 或 "LAMPORTS"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "market": "PUMP_FUN",
    "mint": "TokenMintAddress",
    "price": 0.0000123,
    "unit": "SOL",
    "bondingCurvePercent": 45.67,
    "timestamp": 1704700800000
  }
}
```

**cURL 示例：**
```bash
curl -X POST http://localhost:3000/api/v1/quote \
  -H "Content-Type: application/json" \
  -d '{
    "market": "PUMP_FUN",
    "mint": "YourTokenMintAddress",
    "unit": "SOL"
  }'
```

### 4. Build 交易编码

**Endpoint:** `POST /api/v1/build`

**请求体：**
```json
{
  "market": "PUMP_FUN",
  "direction": "buy",
  "wallet": "YourWalletPublicKey",
  "mint": "TokenMintAddress",
  "amount": 0.1,
  "slippage": 5,
  "priorityFeeSol": 0.0001,
  "tipAmountSol": 0,
  "poolAddress": null,
  "sender": null,
  "antimev": false,
  "region": null,
  "skipSimulation": false
}
```

**参数说明：**
- `market`: 市场标识符（必填）
- `direction`: 交易方向 "buy" 或 "sell"（必填）
- `wallet`: 钱包公钥（必填）
- `mint`: 代币地址（必填）
- `amount`: 数量 - buy 时为 SOL，sell 时为代币数量（必填）
- `slippage`: 滑点百分比 0-100（必填）
- `priorityFeeSol`: 优先级费用，默认 0.0001
- `tipAmountSol`: MEV 保护费用，默认 0
- `poolAddress`: 指定池地址（可选）
- `sender`: MEV 服务 "JITO" | "NOZOMI" | "ASTRALANE"（可选）
- `antimev`: 启用反 MEV 功能（可选）
- `region`: 区域代码（可选）
- `skipSimulation`: 跳过模拟（可选）

**响应：**
```json
{
  "success": true,
  "data": {
    "transaction": "AQAAAAAAAAAAAAEBAQECAg...==",  // base64 编码的交易
    "feePayer": "YourWalletPublicKey",
    "recentBlockhash": "ABC123...",
    "lastValidBlockHeight": 123456789,
    "instructionCount": 5,
    "instructions": [
      {
        "programId": "ComputeBudget111...",
        "accounts": [...],
        "dataLength": 9,
        "index": 0
      }
    ],
    "timestamp": 1704700800000
  }
}
```

**cURL 示例：**
```bash
curl -X POST http://localhost:3000/api/v1/build \
  -H "Content-Type: application/json" \
  -d '{
    "market": "PUMP_FUN",
    "direction": "buy",
    "wallet": "YourWalletPublicKey",
    "mint": "TokenMintAddress",
    "amount": 0.1,
    "slippage": 5
  }'
```

### 5. 增强 Quote（含滑点计算）

**Endpoint:** `POST /api/v1/quote/swap`

**请求体：**
```json
{
  "market": "PUMP_FUN",
  "direction": "buy",
  "mint": "TokenMintAddress",
  "inputAmount": 0.1,
  "slippage": 5
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "market": "PUMP_FUN",
    "direction": "buy",
    "inputAmount": 0.1,
    "inputUnit": "SOL",
    "outputAmount": 8130.08,
    "outputUnit": "TOKENS",
    "minimumReceived": 7723.58,
    "spotPrice": 0.0000123,
    "slippage": 5,
    "bondingCurvePercent": 45.67,
    "timestamp": 1704700800000,
    "note": "This is a simplified calculation..."
  }
}
```

## 客户端集成示例

### JavaScript/TypeScript

```typescript
import axios from 'axios';
import { Connection, Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

const API_BASE_URL = 'http://localhost:3000';

// 1. 获取价格
async function getPrice(market: string, mint: string) {
  const response = await axios.post(`${API_BASE_URL}/api/v1/quote`, {
    market,
    mint,
    unit: 'SOL'
  });
  return response.data.data;
}

// 2. 构建交易
async function buildTransaction(params: {
  market: string;
  direction: 'buy' | 'sell';
  wallet: string;
  mint: string;
  amount: number;
  slippage: number;
}) {
  const response = await axios.post(`${API_BASE_URL}/api/v1/build`, params);
  return response.data.data;
}

// 3. 签名并提交
async function signAndSubmit(
  transactionBase64: string,
  privateKey: string,
  rpcUrl: string
) {
  // 解码交易
  const txBuffer = Buffer.from(transactionBase64, 'base64');
  const transaction = Transaction.from(txBuffer);

  // 签名
  const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
  transaction.sign(wallet);

  // 提交
  const connection = new Connection(rpcUrl, 'confirmed');
  const signature = await connection.sendRawTransaction(
    transaction.serialize()
  );

  return signature;
}

// 完整流程
async function tradingFlow() {
  // 1. 询价
  const quote = await getPrice('PUMP_FUN', 'TokenMintAddress');
  console.log('Price:', quote.price, 'SOL');

  // 2. 构建交易
  const buildResult = await buildTransaction({
    market: 'PUMP_FUN',
    direction: 'buy',
    wallet: 'YourWalletPublicKey',
    mint: 'TokenMintAddress',
    amount: 0.1,
    slippage: 5
  });

  // 3. 签名并提交
  const signature = await signAndSubmit(
    buildResult.transaction,
    'YourPrivateKey',
    'https://api.mainnet-beta.solana.com'
  );

  console.log('Transaction:', signature);
  console.log('Explorer:', `https://solscan.io/tx/${signature}`);
}
```

### Python

```python
import requests
import base58
from solders.keypair import Keypair
from solders.transaction import Transaction
from solana.rpc.api import Client

API_BASE_URL = 'http://localhost:3000'

def get_price(market: str, mint: str):
    response = requests.post(
        f'{API_BASE_URL}/api/v1/quote',
        json={'market': market, 'mint': mint, 'unit': 'SOL'}
    )
    return response.json()['data']

def build_transaction(market: str, direction: str, wallet: str,
                     mint: str, amount: float, slippage: int):
    response = requests.post(
        f'{API_BASE_URL}/api/v1/build',
        json={
            'market': market,
            'direction': direction,
            'wallet': wallet,
            'mint': mint,
            'amount': amount,
            'slippage': slippage
        }
    )
    return response.json()['data']

def sign_and_submit(transaction_base64: str, private_key: str, rpc_url: str):
    # 解码交易
    tx_bytes = base58.b58decode(transaction_base64)
    transaction = Transaction.from_bytes(tx_bytes)

    # 签名
    keypair = Keypair.from_base58_string(private_key)
    transaction.sign([keypair])

    # 提交
    client = Client(rpc_url)
    result = client.send_raw_transaction(transaction.serialize())

    return result.value

# 完整流程
def trading_flow():
    # 1. 询价
    quote = get_price('PUMP_FUN', 'TokenMintAddress')
    print(f"Price: {quote['price']} SOL")

    # 2. 构建交易
    build_result = build_transaction(
        market='PUMP_FUN',
        direction='buy',
        wallet='YourWalletPublicKey',
        mint='TokenMintAddress',
        amount=0.1,
        slippage=5
    )

    # 3. 签名并提交
    signature = sign_and_submit(
        build_result['transaction'],
        'YourPrivateKey',
        'https://api.mainnet-beta.solana.com'
    )

    print(f"Transaction: {signature}")
    print(f"Explorer: https://solscan.io/tx/{signature}")
```

## 注意事项

### 安全性

1. **私钥保护**
   - 永远不要将 `.env` 文件提交到版本控制
   - 生产环境使用环境变量或密钥管理服务
   - 测试和生产使用不同的钱包

2. **API 安全**
   - 生产环境建议添加认证机制
   - 使用 HTTPS 加密传输
   - 实施速率限制

3. **交易验证**
   - 始终验证交易参数
   - 小额测试后再进行大额交易
   - 监控交易状态和区块确认

### 最佳实践

1. **RPC 选择**
   - 使用高性能 RPC 服务（Helius、QuickNode）
   - 避免使用公共 RPC（限流、不稳定）

2. **滑点设置**
   - 低流动性代币使用更高滑点（10-20%）
   - 主流代币可用较低滑点（1-5%）

3. **优先级费用**
   - 拥堵时增加 priorityFeeSol
   - 建议范围：0.0001 - 0.001 SOL

4. **错误处理**
   - 捕获并记录所有 API 错误
   - 实现重试机制（指数退避）
   - 监控交易失败率

## 故障排查

### API 服务无法启动

```bash
# 检查端口占用
lsof -i :3000

# 检查依赖安装
npm install

# 检查环境变量
cat .env
```

### 交易构建失败

- 检查 RPC_URL 是否有效
- 验证代币地址是否正确
- 确认市场类型与代币匹配
- 查看 API 错误日志

### 交易签名失败

- 验证私钥格式（base58）
- 检查 feePayer 地址是否匹配
- 确认 recentBlockhash 未过期

### 交易提交失败

- 检查钱包余额是否足够
- 增加优先级费用
- 调整滑点设置
- 查看交易日志（error.logs）

## 支持的市场

| 市场标识符 | 说明 |
|-----------|------|
| PUMP_FUN | Pump.fun |
| PUMP_SWAP | PumpSwap |
| RAYDIUM_AMM | Raydium AMM |
| RAYDIUM_CLMM | Raydium CLMM |
| RAYDIUM_CPMM | Raydium CPMM |
| RAYDIUM_LAUNCHPAD | Raydium Launchpad |
| ORCA_WHIRLPOOL | Orca Whirlpool |
| METEORA_DLMM | Meteora DLMM |
| METEORA_DAMM_V1 | Meteora DAMM V1 |
| METEORA_DAMM_V2 | Meteora DAMM V2 |
| METEORA_DBC | Meteora DBC |
| MOONIT | Moonit |
| HEAVEN | Heaven XYZ |
| SUGAR | Sugar |
| BOOP_FUN | Boop.fun |

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
