# Quote 接口精确计算技术方案

## 背景

当前 quote 接口使用简单的价格乘法来计算输出数量：
```typescript
outAmount = inAmount / price  // 买入
outAmount = inAmount * price  // 卖出
```

这种方式存在以下问题：
1. **不准确**：未考虑 AMM 曲线、滑点、手续费等因素
2. **不真实**：与实际 swap 结果可能有较大偏差
3. **缺乏细节**：无法提供价格影响、手续费明细等信息

## 目标

实现精确的 quote 计算，使用每个 DEX 的实际算法和池子数据来计算真实的输出数量。

---

## 方案一：实时查询节点（推荐）

### 实现方式

每次 quote 请求时，实时从 Solana 节点查询池子数据，然后使用 DEX SDK 的算法计算精确输出。

```typescript
async function getAccurateQuote(params) {
  // 1. 查询池子信息
  const poolInfo = await findPoolInfo(connection, market, mint);

  // 2. 获取池子实时数据
  const poolData = await connection.getAccountInfo(poolInfo.poolAddress);

  // 3. 使用 DEX SDK 计算
  const swapResult = DEXCalculator.calculateSwap(
    inputAmount,
    poolData.reserves,
    poolData.fees
  );

  return {
    inAmount,
    outAmount: swapResult.outputAmount,
    priceImpact: swapResult.priceImpact,
    fees: swapResult.fees
  };
}
```

### 优点

✅ **最准确**：使用实时数据，结果与实际 swap 最接近
✅ **无需维护**：不需要缓存机制，逻辑简单
✅ **数据最新**：始终使用最新的池子状态
✅ **易于实现**：复用现有的 price 查询逻辑
✅ **支持所有 DEX**：每个 DEX 已有对应的 SDK 和算法

### 缺点

❌ **性能开销**：每次请求都需要查询节点（~100-300ms）
❌ **RPC 压力**：高频请求会增加 RPC 负担
❌ **成本较高**：使用付费 RPC 时成本较高
❌ **可能失败**：网络问题或 RPC 限流时会失败

### 性能指标

- **响应时间**：200-500ms（取决于 RPC 速度）
- **RPC 调用**：每次 quote 需要 2-5 次 RPC 调用
- **并发能力**：受 RPC 限制，通常 100-500 QPS

### 适用场景

- 低频查询（< 10 QPS）
- 对准确性要求极高
- 用户可以接受稍长的响应时间
- 使用高性能 RPC 服务

---

## 方案二：内存缓存 + 定期更新

### 实现方式

在服务启动时和定期（如每 5 秒）更新所有池子数据到内存缓存，quote 请求直接从缓存读取。

```typescript
class PoolDataCache {
  private cache: Map<string, PoolData> = new Map();
  private updateInterval = 5000; // 5 秒

  async start() {
    // 初始化缓存
    await this.updateAllPools();

    // 定期更新
    setInterval(() => this.updateAllPools(), this.updateInterval);
  }

  async updateAllPools() {
    for (const [market, mint] of this.trackedPools) {
      const poolData = await fetchPoolData(market, mint);
      this.cache.set(`${market}:${mint}`, poolData);
    }
  }

  getQuote(market, mint, amount) {
    const poolData = this.cache.get(`${market}:${mint}`);
    return calculateSwap(poolData, amount);
  }
}
```

### 优点

✅ **响应快速**：从内存读取，< 10ms
✅ **高并发**：可支持 1000+ QPS
✅ **RPC 友好**：定期批量更新，减少 RPC 压力
✅ **成本可控**：RPC 调用次数固定

### 缺点

❌ **数据延迟**：最多 5 秒的数据延迟
❌ **内存占用**：需要缓存所有池子数据（~10-50MB）
❌ **复杂度高**：需要实现缓存管理、更新机制
❌ **冷启动慢**：服务启动时需要加载所有数据
❌ **池子管理**：需要维护要跟踪的池子列表

### 性能指标

- **响应时间**：5-20ms
- **RPC 调用**：每 5 秒批量更新一次
- **并发能力**：1000+ QPS
- **内存占用**：10-50MB（取决于池子数量）

### 适用场景

- 高频查询（> 50 QPS）
- 可接受 5 秒数据延迟
- 有固定的热门池子列表
- 需要高性能响应

---

## 方案三：客户端传入池子数据

### 实现方式

客户端在调用 quote 接口时，传入池子的关键数据（reserves、fees 等），服务端直接使用这些数据计算。

```typescript
// API 请求
POST /quote
{
  "inputMint": "...",
  "outputMint": "...",
  "amount": "1000000",
  "market": "RAYDIUM_CPMM",
  "poolData": {
    "poolAddress": "...",
    "baseReserve": "1000000000",
    "quoteReserve": "500000000",
    "tradeFeeRate": "25",
    "timestamp": 1234567890
  }
}

// 服务端计算
function getQuote(params) {
  const { poolData, amount } = params;
  return calculateSwap(poolData, amount);
}
```

### 优点

✅ **零 RPC 调用**：服务端不需要查询节点
✅ **响应极快**：纯计算，< 5ms
✅ **无状态**：服务端无需维护缓存
✅ **可扩展**：支持任意池子，无需预先配置
✅ **成本最低**：不消耗 RPC 资源

### 缺点

❌ **客户端负担**：客户端需要先查询池子数据
❌ **数据可信度**：无法验证客户端传入的数据是否真实
❌ **接口复杂**：需要定义详细的池子数据结构
❌ **兼容性差**：不同 DEX 的池子数据结构不同
❌ **用户体验差**：需要两次请求（先查池子，再 quote）

### 性能指标

- **响应时间**：< 5ms
- **RPC 调用**：0（由客户端负责）
- **并发能力**：10000+ QPS
- **内存占用**：极小

### 适用场景

- 客户端已有池子数据
- 需要极致性能
- 批量计算场景
- 离线计算场景

---

## 方案四：混合方案（推荐用于生产）

### 实现方式

结合方案一和方案二的优点：
1. 对热门池子使用内存缓存
2. 对冷门池子实时查询
3. 提供可选的客户端传入模式

```typescript
class HybridQuoteService {
  private hotPoolCache: PoolDataCache;

  async getQuote(params) {
    const { market, mint, poolAddress } = params;

    // 1. 如果客户端提供了池子数据，直接使用
    if (params.poolData) {
      return this.calculateFromPoolData(params.poolData, params.amount);
    }

    // 2. 检查是否是热门池子（缓存中）
    const cached = this.hotPoolCache.get(market, mint);
    if (cached && !this.isCacheStale(cached)) {
      return this.calculateFromPoolData(cached, params.amount);
    }

    // 3. 实时查询（冷门池子或缓存过期）
    const poolData = await this.fetchPoolDataRealtime(market, mint, poolAddress);
    return this.calculateFromPoolData(poolData, params.amount);
  }
}
```

### 优点

✅ **灵活性高**：支持多种使用场景
✅ **性能优秀**：热门池子快速响应，冷门池子准确计算
✅ **成本可控**：减少不必要的 RPC 调用
✅ **用户友好**：自动选择最优策略

### 缺点

❌ **实现复杂**：需要维护多套逻辑
❌ **配置管理**：需要管理热门池子列表
❌ **测试困难**：多种路径需要全面测试

### 性能指标

- **响应时间**：热门池子 5-20ms，冷门池子 200-500ms
- **RPC 调用**：大幅减少（80% 请求走缓存）
- **并发能力**：500+ QPS
- **内存占用**：10-30MB

---

## 方案对比总结

| 维度 | 方案一：实时查询 | 方案二：内存缓存 | 方案三：客户端传入 | 方案四：混合方案 |
|------|----------------|----------------|------------------|----------------|
| **准确性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **响应速度** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **RPC 成本** | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **实现难度** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **维护成本** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **可扩展性** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **用户体验** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 推荐方案

### 短期（MVP）：方案一 - 实时查询

**理由**：
- 实现简单，可快速上线
- 复用现有代码，改动最小
- 准确性最高，适合初期验证

**实施步骤**：
1. 为每个 DEX 创建 `getAccurateQuote` 函数
2. 在 quote 接口中调用对应的计算函数
3. 返回详细的 swap 结果（包括价格影响、手续费等）

### 长期（生产）：方案四 - 混合方案

**理由**：
- 平衡性能和准确性
- 适应不同使用场景
- 可根据实际情况优化

**实施步骤**：
1. 先实现方案一（实时查询）
2. 收集热门池子数据，实现缓存层
3. 添加客户端传入模式作为可选项
4. 根据监控数据持续优化

---

## 实现建议

### 1. 接口设计

```typescript
// Quote 请求
interface QuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: number;
  market: string;
  poolAddress?: string;  // 可选：指定池子
  poolData?: PoolData;   // 可选：客户端提供的池子数据
}

// Quote 响应
interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: 'ExactIn';
  slippageBps: number;
  priceImpactPct: string;  // 价格影响
  market: string;
  poolAddress: string;

  // 详细信息
  details: {
    spotPrice: string;
    executionPrice: string;
    fees: {
      tradeFee: string;
      protocolFee: string;
      totalFee: string;
    };
    route: {
      poolAddress: string;
      reserves: {
        base: string;
        quote: string;
      };
    };
  };

  contextSlot: number;
  timeTaken: number;
}
```

### 2. 错误处理

- 池子不存在：返回明确的错误信息
- 流动性不足：提示用户减少交易数量
- RPC 超时：提供重试机制或降级到缓存数据

### 3. 监控指标

- Quote 请求成功率
- 平均响应时间
- RPC 调用次数
- 缓存命中率（如使用缓存）
- 价格偏差（quote vs 实际 swap）

---

## 下一步行动

1. **确认方案**：选择短期和长期方案
2. **技术评审**：评估现有 DEX SDK 的计算能力
3. **原型开发**：实现一个 DEX 的精确 quote
4. **性能测试**：验证响应时间和准确性
5. **逐步推广**：扩展到所有支持的 DEX
