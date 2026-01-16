# 项目文档索引

本目录包含 Solana DEX 交易打包服务的完整技术文档。

## 📚 核心技术文档

### 1. 设计文档
- **[DESIGN.md](./DESIGN.md)** - 项目设计文档
  - 项目背景与业务价值
  - 系统架构设计
  - 核心功能模块
  - 技术栈与项目结构
  - 接口概览与核心流程

### 2. 核心设计
- **[CORE_DESIGN_QUOTE.md](./CORE_DESIGN_QUOTE.md)** - Quote 计算核心设计
  - Quote 计算系统设计目标
  - 三层 Fallback 架构
  - PumpFun/PumpSwap/Raydium CPMM 详细实现
  - 账户结构、算法公式、计算逻辑
  - 性能对比与优化建议

### 3. API 交付
- **[API_DELIVERY.md](./API_DELIVERY.md)** - API 接口交付文档
  - 完整 API 接口规范
  - 请求/响应格式与字段说明
  - 错误码定义与错误处理
  - 多语言使用示例
  - 接口测试用例

### 4. 运维部署
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 部署运维文档
  - 环境要求与系统配置
  - 安装部署步骤
  - 启动命令与进程管理
  - 配置管理与性能调优
  - 监控运维与故障排查

### 5. 测试文档
- **[TESTING.md](./TESTING.md)** - 测试策略与实践
  - 测试策略与测试层级
  - 单元测试示例代码
  - 集成测试与端到端测试
  - 性能测试与压力测试
  - 完整的自测代码示例

## 📖 参考文档

### Quote 实现相关
- **[DEX_QUOTE_IMPLEMENTATION.md](./DEX_QUOTE_IMPLEMENTATION.md)** - DEX Quote 实现方案
- **[NATIVE_QUOTE_SUMMARY.md](./NATIVE_QUOTE_SUMMARY.md)** - 原生 Quote 完成总结
- **[QUOTE_IMPROVEMENT_PROPOSAL.md](./QUOTE_IMPROVEMENT_PROPOSAL.md)** - Quote 改进提案

## 🗂️ 文档结构

```
docs/
├── README.md                          # 本文件 - 文档索引
├── DESIGN.md                          # 设计文档
├── CORE_DESIGN_QUOTE.md               # 核心设计 - Quote 计算
├── API_DELIVERY.md                    # API 交付文档
├── DEPLOYMENT.md                      # 运维部署文档
├── TESTING.md                         # 测试文档
├── DEX_QUOTE_IMPLEMENTATION.md        # DEX Quote 实现方案
├── NATIVE_QUOTE_SUMMARY.md            # 原生 Quote 总结
└── QUOTE_IMPROVEMENT_PROPOSAL.md      # Quote 改进提案
```

## 🚀 快速开始

1. **了解项目**: 从 [DESIGN.md](./DESIGN.md) 开始
2. **理解核心逻辑**: 阅读 [CORE_DESIGN_QUOTE.md](./CORE_DESIGN_QUOTE.md)
3. **集成 API**: 参考 [API_DELIVERY.md](./API_DELIVERY.md)
4. **部署服务**: 按照 [DEPLOYMENT.md](./DEPLOYMENT.md) 操作
5. **运行测试**: 使用 [TESTING.md](./TESTING.md) 中的测试代码

## 📝 文档维护

- **版本**: 1.0.0
- **最后更新**: 2026-01-15
- **维护者**: 开发团队

---

**返回**: [项目主页](../README.md)
