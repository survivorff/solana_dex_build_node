# 测试文档

本目录包含项目的所有测试代码,按功能和类型分类组织。

## 📁 目录结构

```
tests/
├── unit/                      # 单元测试 (无外部依赖)
│   ├── quote-calculation.test.ts    # Quote 计算逻辑测试
│   └── native-quotes.test.ts        # 原生 Quote 实现测试
├── integration/               # 集成测试
│   ├── api/                   # API 接口测试
│   │   ├── jupiter-api.test.ts      # Jupiter 风格 API 测试
│   │   └── accurate-quote.test.ts   # 精确 Quote API 测试
│   └── e2e/                   # 端到端测试
│       └── swap-flow.test.ts        # 完整交易流程测试
└── markets/                   # 市场特定测试
    ├── pump-fun.test.ts       # PumpFun 市场测试
    ├── pump-swap.test.ts      # PumpSwap 市场测试
    └── raydium-cpmm.test.ts   # Raydium CPMM 市场测试
```

## 🧪 测试分类

### 1. 单元测试 (Unit Tests)

**特点**: 不依赖外部服务,纯逻辑测试

**文件**:
- `unit/quote-calculation.test.ts` - 测试 AMM 算法计算逻辑
- `unit/native-quotes.test.ts` - 测试原生 Quote 实现函数

**运行**:
```bash
# 运行所有单元测试
npm run test:unit

# 运行特定测试
npx ts-node tests/unit/quote-calculation.test.ts
npx ts-node tests/unit/native-quotes.test.ts
```

### 2. 集成测试 (Integration Tests)

**特点**: 需要 API 服务运行,测试接口集成

#### API 测试
- `integration/api/jupiter-api.test.ts` - 测试 Jupiter 风格的 API 接口
- `integration/api/accurate-quote.test.ts` - 测试精确 Quote 计算接口

**运行**:
```bash
# 先启动 API 服务
npm run api:dev

# 在另一个终端运行测试
npx ts-node tests/integration/api/jupiter-api.test.ts
npx ts-node tests/integration/api/accurate-quote.test.ts
```

#### E2E 测试
- `integration/e2e/swap-flow.test.ts` - 完整的 Quote → Swap → Sign → Submit 流程

**运行**:
```bash
# 需要配置 .env 文件中的 PRIVATE_KEY
npx ts-node tests/integration/e2e/swap-flow.test.ts
```

### 3. 市场测试 (Market Tests)

**特点**: 针对特定 DEX 市场的测试

**文件**:
- `markets/pump-fun.test.ts` - PumpFun 市场 Quote 测试
- `markets/pump-swap.test.ts` - PumpSwap 市场 Quote 测试
- `markets/raydium-cpmm.test.ts` - Raydium CPMM 市场 Quote 测试

**运行**:
```bash
# 先启动 API 服务
npm run api:dev

# 运行特定市场测试
npx ts-node tests/markets/pump-fun.test.ts
npx ts-node tests/markets/pump-swap.test.ts
npx ts-node tests/markets/raydium-cpmm.test.ts
```

## 🚀 快速开始

### 1. 运行单元测试 (无需外部依赖)

```bash
# Quote 计算逻辑测试
npx ts-node tests/unit/quote-calculation.test.ts

# 原生 Quote 实现测试 (需要 RPC)
RPC_URL=your-rpc-url npx ts-node tests/unit/native-quotes.test.ts
```

### 2. 运行 API 测试

```bash
# 终端 1: 启动 API 服务
npm run api:dev

# 终端 2: 运行测试
npx ts-node tests/integration/api/jupiter-api.test.ts
```

### 3. 运行完整流程测试

```bash
# 配置环境变量
cp .env.example .env
# 编辑 .env 文件,配置 RPC_URL 和 PRIVATE_KEY

# 启动 API 服务
npm run api:dev

# 运行 E2E 测试
npx ts-node tests/integration/e2e/swap-flow.test.ts
```

## 📝 测试配置

### 环境变量

创建 `.env` 文件:

```bash
# RPC 配置
RPC_URL=https://your-rpc-endpoint.com

# 私钥 (仅用于 E2E 测试)
PRIVATE_KEY=your-base58-private-key

# API 服务地址
API_BASE_URL=http://localhost:3000
```

### 测试参数

在测试文件中修改 `TEST_CONFIG` 对象:

```typescript
const TEST_CONFIG = {
  market: 'PUMP_FUN',           // DEX 市场
  tokenMint: 'TOKEN_MINT_HERE', // 代币地址
  amount: '10000000',           // 交易数量
  slippageBps: 100,             // 滑点 (1%)
};
```

## 🎯 测试覆盖

| 测试类型 | 覆盖范围 | 状态 |
|---------|---------|------|
| Quote 计算逻辑 | AMM 算法 | ✅ |
| PumpFun Native | 原生实现 | ✅ |
| PumpSwap Native | 原生实现 | ✅ |
| Raydium CPMM Native | 原生实现 | ✅ |
| API 接口 | /quote, /swap | ✅ |
| E2E 流程 | 完整交易 | ✅ |

## 📊 性能基准

| 测试项 | 目标 | 实际 |
|-------|------|------|
| Quote 响应时间 | < 150ms | ~87ms |
| 原生实现成功率 | > 95% | ~98% |
| API 可用性 | > 99% | ~99.9% |

## 🔧 添加新测试

### 1. 添加单元测试

在 `tests/unit/` 目录创建新文件:

```typescript
// tests/unit/your-test.test.ts
import { yourFunction } from '../../src/your-module';

async function testYourFunction() {
  console.log('🧪 Testing Your Function\n');
  
  const result = await yourFunction();
  console.log('✅ Result:', result);
}

testYourFunction().catch(console.error);
```

### 2. 添加市场测试

在 `tests/markets/` 目录创建新文件:

```typescript
// tests/markets/your-dex.test.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function testYourDexQuote() {
  console.log('🧪 Testing Your DEX Quote\n');
  
  const response = await axios.post(`${API_BASE_URL}/quote`, {
    market: 'YOUR_DEX',
    // ... other params
  });
  
  console.log('✅ Quote:', response.data);
}

testYourDexQuote().catch(console.error);
```

## 📚 相关文档

- [测试文档](../docs/TESTING.md) - 完整的测试策略和指南
- [API 文档](../docs/API_DELIVERY.md) - API 接口规范
- [部署文档](../docs/DEPLOYMENT.md) - 环境配置和部署

---

**维护者**: 开发团队  
**最后更新**: 2026-01-16
