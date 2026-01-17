# 测试快速开始指南

## 🚀 快速运行测试

### 1. 单元测试 (无需外部依赖)

```bash
# Quote 计算逻辑测试
npm run test:unit

# 原生 Quote 实现测试 (需要 RPC)
npm run test:unit:native
```

### 2. API 测试 (需要启动 API 服务)

```bash
# 终端 1: 启动 API 服务
npm run api:dev

# 终端 2: 运行测试
npm run test:api:jupiter      # Jupiter 风格 API 测试
npm run test:api:quote         # 精确 Quote API 测试
```

### 3. 市场测试 (需要启动 API 服务)

```bash
# 终端 1: 启动 API 服务
npm run api:dev

# 终端 2: 运行市场测试
npm run test:market:pumpfun    # PumpFun 测试
npm run test:market:pumpswap   # PumpSwap 测试
npm run test:market:raydium    # Raydium CPMM 测试
```

### 4. E2E 测试 (需要配置私钥)

```bash
# 配置 .env 文件
cp .env.example .env
# 编辑 .env,添加 PRIVATE_KEY

# 启动 API 服务
npm run api:dev

# 运行 E2E 测试
npm run test:e2e
```

## 📋 测试清单

### 开发阶段测试

- [ ] 运行单元测试确保逻辑正确
- [ ] 运行 API 测试确保接口正常
- [ ] 运行市场测试确保各 DEX 集成正常

### 部署前测试

- [ ] 运行所有单元测试
- [ ] 运行所有 API 测试
- [ ] 运行所有市场测试
- [ ] 运行 E2E 测试确保完整流程正常

### 生产环境测试

- [ ] 健康检查: `curl http://localhost:3000/health`
- [ ] 市场列表: `curl http://localhost:3000/markets`
- [ ] Quote 测试: 使用小额测试交易

## 🔧 测试配置

### 环境变量

创建 `.env` 文件:

```bash
# RPC 配置 (必需)
RPC_URL=https://your-rpc-endpoint.com

# 私钥 (仅 E2E 测试需要)
PRIVATE_KEY=your-base58-private-key

# API 服务地址 (可选)
API_BASE_URL=http://localhost:3000
```

### 测试代币

在测试文件中修改代币地址:

```typescript
// tests/markets/pump-fun.test.ts
const tokenMint = 'YOUR_TOKEN_MINT_HERE';
```

## 📊 测试输出示例

### 成功输出

```
🧪 Testing PumpFun Accurate Quote

📤 Request: {
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "TOKEN_MINT",
  "amount": "10000000",
  "slippageBps": 100,
  "market": "PUMP_FUN"
}

📥 Response:
  Input Amount: 10000000
  Output Amount: 95234567
  Min Output (with slippage): 94282341
  Price Impact: 0.1234%
  Time Taken: 87ms

✅ PumpFun Quote Test Passed
```

### 失败输出

```
❌ PumpFun Quote Test Failed:
  Error: Pool not found for the given token pair
```

## 🐛 常见问题

### 1. RPC 连接失败

```
Error: RPC request timed out
```

**解决方案**:
- 检查 RPC_URL 是否正确
- 尝试使用其他 RPC 提供商
- 增加超时时间

### 2. API 服务未启动

```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**解决方案**:
- 确保 API 服务已启动: `npm run api:dev`
- 检查端口是否被占用

### 3. 代币地址无效

```
Error: Pool not found
```

**解决方案**:
- 使用有效的代币地址
- 确认代币在对应的 DEX 上有池子

## 📚 更多信息

- [完整测试文档](./README.md)
- [测试策略](../docs/TESTING.md)
- [API 文档](../docs/API_DELIVERY.md)
