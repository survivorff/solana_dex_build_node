# API 交付文档

## 目录
- [1. API 接口规范](#1-api-接口规范)
- [2. 错误码定义](#2-错误码定义)
- [3. 使用示例](#3-使用示例)
- [4. 接口测试](#4-接口测试)

---

## 1. API 接口规范

### 1.1 Quote 接口

**端点**: `POST /quote`

**功能**: 计算交易的精确输出数量

**请求参数**:
```json
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "TOKEN_MINT_ADDRESS",
  "amount": "10000000",
  "slippageBps": 100,
  "market": "PUMP_FUN",
  "poolAddress": "POOL_ADDRESS"
}
```

**参数说明**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| inputMint | string | ✅ | 输入代币地址 |
| outputMint | string | ✅ | 输出代币地址 |
| amount | string | ✅ | 输入数量(最小单位) |
| slippageBps | number | ✅ | 滑点(基点, 100=1%) |
| market | string | ✅ | DEX 市场名称 |
| poolAddress | string | ❌ | 池子地址(Raydium CPMM 必需) |

**响应示例**:
```json
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "TOKEN_MINT_ADDRESS",
  "inAmount": "10000000",
  "outAmount": "95234567",
  "otherAmountThreshold": "94282341",
  "swapMode": "ExactIn",
  "slippageBps": 100,
  "priceImpactPct": "0.1234",
  "market": "PUMP_FUN",
  "poolAddress": "BONDING_CURVE_PDA",
  "details": {
    "spotPrice": "9.5234567",
    "executionPrice": "9.5234567",
    "fees": {
      "tradeFee": "100000",
      "protocolFee": "0",
      "totalFee": "100000"
    },
    "route": {
      "poolAddress": "BONDING_CURVE_PDA",
      "reserves": {
        "base": "1000000000000",
        "quote": "105000000000"
      }
    }
  },
  "contextSlot": 123456789,
  "timeTaken": 87
}
```

**响应字段说明**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| inAmount | string | 输入数量 |
| outAmount | string | 输出数量 |
| otherAmountThreshold | string | 最小输出(含滑点) |
| priceImpactPct | string | 价格影响百分比 |
| details.spotPrice | string | 现货价格 |
| details.executionPrice | string | 执行价格 |
| details.fees | object | 手续费明细 |
| contextSlot | number | 区块高度 |
| timeTaken | number | 响应时间(ms) |

---

### 1.2 Swap 接口

**端点**: `POST /swap`

**功能**: 构建未签名的交易

**请求参数**:
```json
{
  "quoteResponse": {
    /* quote 接口的完整响应 */
  },
  "userPublicKey": "USER_WALLET_ADDRESS",
  "priorityFee": 0.0001,
  "sender": "standard"
}
```

**参数说明**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| quoteResponse | object | ✅ | quote 接口返回的完整对象 |
| userPublicKey | string | ✅ | 用户钱包地址 |
| priorityFee | number | ❌ | 优先级费用(SOL) |
| sender | string | ❌ | 交易发送方式: standard/jito/nozomi/astralane |

**响应示例**:
```json
{
  "swapTransaction": "BASE64_ENCODED_TRANSACTION",
  "lastValidBlockHeight": 123456789
}
```

**响应字段说明**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| swapTransaction | string | Base64 编码的未签名交易 |
| lastValidBlockHeight | number | 交易有效的最后区块高度 |

---

### 1.3 Markets 接口

**端点**: `GET /markets`

**功能**: 获取支持的 DEX 列表

**响应示例**:
```json
{
  "markets": [
    "PUMP_FUN",
    "PUMP_SWAP",
    "RAYDIUM_CPMM",
    "RAYDIUM_AMM",
    "RAYDIUM_CLMM",
    "RAYDIUM_LAUNCHPAD",
    "ORCA_WHIRLPOOL",
    "METEORA_DLMM",
    "METEORA_DAMM_V1",
    "METEORA_DAMM_V2",
    "METEORA_DBC",
    "MOONIT",
    "HEAVEN",
    "SUGAR",
    "BOOP_FUN"
  ]
}
```

---

### 1.4 Health 接口

**端点**: `GET /health`

**功能**: 健康检查

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "version": "1.0.0",
  "uptime": 3600
}
```

---

## 2. 错误码定义

### 2.1 错误类型

| 错误类型 | HTTP 状态码 | 错误代码 | 说明 |
|---------|-----------|---------|------|
| 参数验证失败 | 400 | INVALID_PARAMS | 请求参数不合法 |
| 池子不存在 | 404 | POOL_NOT_FOUND | 找不到指定的池子 |
| 流动性不足 | 400 | INSUFFICIENT_LIQUIDITY | 池子流动性不足 |
| RPC 超时 | 504 | RPC_TIMEOUT | RPC 节点响应超时 |
| 不支持的市场 | 400 | UNSUPPORTED_MARKET | 不支持的 DEX 市场 |
| 内部错误 | 500 | INTERNAL_ERROR | 服务器内部错误 |

### 2.2 错误响应格式

```json
{
  "error": {
    "code": "POOL_NOT_FOUND",
    "message": "Pool not found for the given token pair",
    "details": {
      "market": "PUMP_FUN",
      "inputMint": "So11111111111111111111111111111111111111112",
      "outputMint": "TOKEN_MINT_ADDRESS"
    }
  }
}
```

### 2.3 常见错误场景

**场景 1: 参数验证失败**
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "Invalid amount: must be a positive number",
    "details": {
      "field": "amount",
      "value": "-100"
    }
  }
}
```

**场景 2: 池子不存在**
```json
{
  "error": {
    "code": "POOL_NOT_FOUND",
    "message": "No pool found for token pair",
    "details": {
      "market": "RAYDIUM_CPMM",
      "inputMint": "So11111111111111111111111111111111111111112",
      "outputMint": "INVALID_TOKEN_ADDRESS"
    }
  }
}
```

**场景 3: RPC 超时**
```json
{
  "error": {
    "code": "RPC_TIMEOUT",
    "message": "RPC request timed out after 30000ms",
    "details": {
      "rpcEndpoint": "https://api.mainnet-beta.solana.com",
      "timeout": 30000
    }
  }
}
```

---

## 3. 使用示例

### 3.1 TypeScript/JavaScript

```typescript
import axios from 'axios';
import { Connection, Transaction, Keypair } from '@solana/web3.js';

const API_BASE = 'http://localhost:3000';

async function swapExample() {
  // 1. 获取 Quote
  const quoteResponse = await axios.post(`${API_BASE}/quote`, {
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'TOKEN_MINT_ADDRESS',
    amount: '10000000',
    slippageBps: 100,
    market: 'PUMP_FUN'
  });

  console.log('Output amount:', quoteResponse.data.outAmount);
  console.log('Price impact:', quoteResponse.data.priceImpactPct);
  console.log('Time taken:', quoteResponse.data.timeTaken, 'ms');

  // 2. 构建交易
  const swapResponse = await axios.post(`${API_BASE}/swap`, {
    quoteResponse: quoteResponse.data,
    userPublicKey: wallet.publicKey.toString(),
    priorityFee: 0.0001,
    sender: 'standard'
  });

  // 3. 签名并发送交易
  const transaction = Transaction.from(
    Buffer.from(swapResponse.data.swapTransaction, 'base64')
  );
  
  const signature = await wallet.sendTransaction(transaction, connection);
  console.log('Transaction signature:', signature);
  
  // 4. 等待确认
  await connection.confirmTransaction(signature);
  console.log('Transaction confirmed');
}
```

### 3.2 Python

```python
import requests
import base64
from solana.rpc.api import Client
from solana.transaction import Transaction

API_BASE = 'http://localhost:3000'

def swap_example():
    # 1. 获取 Quote
    quote_response = requests.post(f'{API_BASE}/quote', json={
        'inputMint': 'So11111111111111111111111111111111111111112',
        'outputMint': 'TOKEN_MINT_ADDRESS',
        'amount': '10000000',
        'slippageBps': 100,
        'market': 'PUMP_FUN'
    })
    
    quote_data = quote_response.json()
    print(f"Output amount: {quote_data['outAmount']}")
    print(f"Price impact: {quote_data['priceImpactPct']}")
    print(f"Time taken: {quote_data['timeTaken']} ms")
    
    # 2. 构建交易
    swap_response = requests.post(f'{API_BASE}/swap', json={
        'quoteResponse': quote_data,
        'userPublicKey': 'YOUR_WALLET_ADDRESS',
        'priorityFee': 0.0001,
        'sender': 'standard'
    })
    
    swap_data = swap_response.json()
    transaction_bytes = base64.b64decode(swap_data['swapTransaction'])
    
    # 3. 签名并发送交易
    # (需要使用 Solana Python SDK 进行签名和发送)
    print(f"Transaction ready, size: {len(transaction_bytes)} bytes")
```

### 3.3 cURL

```bash
# 获取 Quote
curl -X POST http://localhost:3000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "inputMint": "So11111111111111111111111111111111111111112",
    "outputMint": "TOKEN_MINT_ADDRESS",
    "amount": "10000000",
    "slippageBps": 100,
    "market": "PUMP_FUN"
  }'

# 构建交易
curl -X POST http://localhost:3000/swap \
  -H "Content-Type: application/json" \
  -d '{
    "quoteResponse": {...},
    "userPublicKey": "YOUR_WALLET_ADDRESS",
    "priorityFee": 0.0001,
    "sender": "standard"
  }'

# 获取支持的市场
curl http://localhost:3000/markets

# 健康检查
curl http://localhost:3000/health
```

---

## 4. 接口测试

### 4.1 测试用例

**测试 1: PumpFun Quote**
```bash
curl -X POST http://localhost:3000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "inputMint": "So11111111111111111111111111111111111111112",
    "outputMint": "PUMP_TOKEN_MINT",
    "amount": "10000000",
    "slippageBps": 100,
    "market": "PUMP_FUN"
  }'
```

**预期结果**:
- HTTP 状态码: 200
- 响应时间: < 150ms
- 包含 outAmount, priceImpactPct, timeTaken 字段

**测试 2: PumpSwap Quote**
```bash
curl -X POST http://localhost:3000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "inputMint": "So11111111111111111111111111111111111111112",
    "outputMint": "PUMPSWAP_TOKEN_MINT",
    "amount": "10000000",
    "slippageBps": 100,
    "market": "PUMP_SWAP"
  }'
```

**预期结果**:
- HTTP 状态码: 200
- 响应时间: < 150ms
- 包含手续费明细(tradeFee, protocolFee)

**测试 3: Raydium CPMM Quote**
```bash
curl -X POST http://localhost:3000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "inputMint": "So11111111111111111111111111111111111111112",
    "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": "10000000",
    "slippageBps": 100,
    "market": "RAYDIUM_CPMM",
    "poolAddress": "POOL_ADDRESS"
  }'
```

**预期结果**:
- HTTP 状态码: 200
- 响应时间: < 150ms
- 包含多层级手续费(tradeFee, protocolFee, fundFee)

**测试 4: 错误处理 - 无效参数**
```bash
curl -X POST http://localhost:3000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "inputMint": "INVALID",
    "outputMint": "TOKEN_MINT",
    "amount": "-100",
    "slippageBps": 100,
    "market": "PUMP_FUN"
  }'
```

**预期结果**:
- HTTP 状态码: 400
- 错误代码: INVALID_PARAMS

**测试 5: 错误处理 - 池子不存在**
```bash
curl -X POST http://localhost:3000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "inputMint": "So11111111111111111111111111111111111111112",
    "outputMint": "NONEXISTENT_TOKEN",
    "amount": "10000000",
    "slippageBps": 100,
    "market": "PUMP_FUN"
  }'
```

**预期结果**:
- HTTP 状态码: 404
- 错误代码: POOL_NOT_FOUND

### 4.2 性能测试

```bash
# 批量测试响应时间
for i in {1..100}; do
  time curl -X POST http://localhost:3000/quote \
    -H "Content-Type: application/json" \
    -d '{...}'
done

# 使用 Apache Bench 进行压力测试
ab -n 1000 -c 10 -p quote.json -T application/json \
  http://localhost:3000/quote
```

**性能指标**:
- 平均响应时间: < 150ms
- 95th 百分位: < 200ms
- 99th 百分位: < 300ms
- 成功率: > 99%

---

**相关文档**:
- [设计文档](./DESIGN.md)
- [核心设计 - Quote 计算](./CORE_DESIGN_QUOTE.md)
- [部署文档](./DEPLOYMENT.md)
- [测试文档](./TESTING.md)

---

**文档版本**: 1.0.0  
**最后更新**: 2026-01-15  
**维护者**: 开发团队
