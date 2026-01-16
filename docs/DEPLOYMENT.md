# 运维部署文档

## 目录
- [1. 环境要求](#1-环境要求)
- [2. 安装部署](#2-安装部署)
- [3. 启动命令](#3-启动命令)
- [4. 配置管理](#4-配置管理)
- [5. 监控运维](#5-监控运维)
- [6. 故障排查](#6-故障排查)

---

## 1. 环境要求

### 1.1 系统要求

**硬件要求**:
- CPU: 2核心及以上
- 内存: 2GB 及以上
- 磁盘空间: 10GB 及以上
- 网络: 稳定的互联网连接

**软件要求**:
- Node.js >= 18.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0
- TypeScript >= 5.0.0
- Git (用于代码管理)

**操作系统**:
- macOS 10.15+
- Linux (Ubuntu 20.04+, CentOS 8+)
- Windows 10+ (WSL2 推荐)

### 1.2 RPC 节点要求

**推荐 RPC 提供商**:
- Helius (推荐)
- QuickNode
- Alchemy
- 自建节点

**RPC 配置要求**:
- 超时设置: 30-60秒
- 支持方法: getAccountInfo, getMultipleAccounts
- 速率限制: 建议 100+ RPS
- 区域: 选择低延迟区域

**RPC 性能指标**:
- 平均响应时间: < 100ms
- 可用性: > 99.9%
- 支持 WebSocket (可选)

---

## 2. 安装部署

### 2.1 克隆代码

```bash
# 克隆仓库
git clone <repository-url>
cd solana_dex_build_node

# 切换到指定分支
git checkout main
```

### 2.2 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

### 2.3 配置环境变量

创建 `.env` 文件:

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置文件
vim .env
```

`.env` 文件内容:

```bash
# RPC 配置
RPC_URL=https://your-rpc-endpoint.com
RPC_TIMEOUT=30000

# 服务配置
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Jito 配置 (可选)
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
JITO_TIP_ACCOUNT=

# Nozomi 配置 (可选)
NOZOMI_API_KEY=

# Astralane 配置 (可选)
ASTRALANE_API_KEY=
```

### 2.4 编译项目

```bash
# TypeScript 编译
npm run build

# 或使用 yarn
yarn build
```

---

## 3. 启动命令

### 3.1 开发环境

```bash
# 启动开发服务器 (带热重载)
npm run api:dev

# 或使用 yarn
yarn api:dev
```

**特点**:
- 自动重启
- 详细日志输出
- 源码映射支持

### 3.2 生产环境

```bash
# 启动生产服务器
npm run api:start

# 或使用 yarn
yarn api:start
```

**特点**:
- 优化性能
- 精简日志
- 错误处理

### 3.3 使用 PM2 管理

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start npm --name "dex-api" -- run api:start

# 查看状态
pm2 status

# 查看日志
pm2 logs dex-api

# 重启服务
pm2 restart dex-api

# 停止服务
pm2 stop dex-api

# 删除服务
pm2 delete dex-api
```

### 3.4 使用 Docker 部署

**Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "api:start"]
```

**构建和运行**:
```bash
# 构建镜像
docker build -t dex-api:latest .

# 运行容器
docker run -d \
  --name dex-api \
  -p 3000:3000 \
  --env-file .env \
  dex-api:latest

# 查看日志
docker logs -f dex-api

# 停止容器
docker stop dex-api

# 删除容器
docker rm dex-api
```

### 3.5 使用 Docker Compose

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  dex-api:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**启动服务**:
```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

---

## 4. 配置管理

### 4.1 环境变量说明

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|-------|------|------|--------|------|
| RPC_URL | string | ✅ | - | Solana RPC 节点地址 |
| RPC_TIMEOUT | number | ❌ | 30000 | RPC 超时时间(ms) |
| PORT | number | ❌ | 3000 | API 服务端口 |
| NODE_ENV | string | ❌ | development | 运行环境 |
| LOG_LEVEL | string | ❌ | info | 日志级别 |
| JITO_BLOCK_ENGINE_URL | string | ❌ | - | Jito 服务地址 |
| JITO_TIP_ACCOUNT | string | ❌ | - | Jito 小费账户 |
| NOZOMI_API_KEY | string | ❌ | - | Nozomi API 密钥 |
| ASTRALANE_API_KEY | string | ❌ | - | Astralane API 密钥 |

### 4.2 日志级别

| 级别 | 说明 | 使用场景 |
|-----|------|---------|
| error | 仅错误 | 生产环境 |
| warn | 警告及以上 | 生产环境 |
| info | 信息及以上 | 默认 |
| debug | 调试信息 | 开发环境 |
| trace | 详细追踪 | 问题排查 |

### 4.3 性能调优

**Node.js 参数**:
```bash
# 增加内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm run api:start

# 启用性能分析
NODE_OPTIONS="--prof" npm run api:start
```

**RPC 连接池**:
```typescript
// 在代码中配置
const connection = new Connection(RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
  httpHeaders: {
    'Content-Type': 'application/json',
  }
});
```

---

## 5. 监控运维

### 5.1 监控指标

**系统指标**:
- CPU 使用率
- 内存使用率
- 磁盘使用率
- 网络流量

**应用指标**:
- API 请求数
- 响应时间
- 错误率
- RPC 调用次数

**业务指标**:
- Quote 成功率
- 原生实现成功率
- SDK Fallback 触发率
- 各 DEX 使用量

### 5.2 监控目标

| 指标 | 目标值 | 告警阈值 | 说明 |
|-----|--------|---------|------|
| Quote 响应时间 | < 150ms | > 300ms | 原生实现 |
| 原生实现成功率 | > 95% | < 90% | Native quote |
| SDK Fallback 率 | < 5% | > 10% | 降级触发 |
| 服务可用性 | > 99.9% | < 99% | 整体可用性 |
| RPC 错误率 | < 1% | > 5% | RPC 调用 |
| API 错误率 | < 0.1% | > 1% | 接口错误 |

### 5.3 健康检查

**端点**: `GET /health`

**检查脚本**:
```bash
#!/bin/bash

# 健康检查脚本
HEALTH_URL="http://localhost:3000/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
  echo "Service is healthy"
  exit 0
else
  echo "Service is unhealthy (HTTP $RESPONSE)"
  exit 1
fi
```

**定时检查 (crontab)**:
```bash
# 每分钟检查一次
* * * * * /path/to/health-check.sh
```

### 5.4 日志管理

**日志位置**:
```bash
# PM2 日志
~/.pm2/logs/dex-api-out.log
~/.pm2/logs/dex-api-error.log

# Docker 日志
docker logs dex-api
```

**日志轮转**:
```bash
# PM2 日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**日志查看**:
```bash
# 实时查看
tail -f ~/.pm2/logs/dex-api-out.log

# 查看最近 100 行
tail -n 100 ~/.pm2/logs/dex-api-out.log

# 搜索错误
grep "ERROR" ~/.pm2/logs/dex-api-error.log
```

### 5.5 告警配置

**告警规则示例**:
```yaml
alerts:
  - name: high_response_time
    condition: avg(response_time) > 300ms
    duration: 5m
    action: notify_team
    
  - name: high_error_rate
    condition: error_rate > 1%
    duration: 5m
    action: notify_team
    
  - name: service_down
    condition: health_check_failed
    duration: 1m
    action: notify_team_urgent
```

---

## 6. 故障排查

### 6.1 常见问题

**问题 1: 服务无法启动**

症状:
```
Error: Cannot find module '@solana/web3.js'
```

解决方案:
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

**问题 2: RPC 连接超时**

症状:
```
Error: RPC request timed out after 30000ms
```

解决方案:
```bash
# 1. 检查 RPC 地址是否正确
echo $RPC_URL

# 2. 测试 RPC 连接
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# 3. 增加超时时间
export RPC_TIMEOUT=60000
```

**问题 3: Quote 计算失败**

症状:
```
Native implementation failed: Account not found
SDK implementation failed: Pool not found
```

解决方案:
```bash
# 1. 检查池子地址是否正确
# 2. 确认代币地址有效
# 3. 查看详细日志
LOG_LEVEL=debug npm run api:start
```

**问题 4: 内存溢出**

症状:
```
FATAL ERROR: Ineffective mark-compacts near heap limit
```

解决方案:
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm run api:start
```

### 6.2 调试技巧

**启用详细日志**:
```bash
LOG_LEVEL=debug npm run api:dev
```

**使用 Node.js 调试器**:
```bash
# 启动调试模式
node --inspect dist/api-server.js

# 在 Chrome 中打开
chrome://inspect
```

**性能分析**:
```bash
# 生成性能分析文件
NODE_OPTIONS="--prof" npm run api:start

# 分析性能文件
node --prof-process isolate-*.log > profile.txt
```

### 6.3 紧急恢复

**服务重启**:
```bash
# PM2
pm2 restart dex-api

# Docker
docker restart dex-api

# Docker Compose
docker-compose restart
```

**回滚版本**:
```bash
# Git 回滚
git checkout <previous-commit>
npm install
npm run build
pm2 restart dex-api
```

**数据备份**:
```bash
# 备份配置
cp .env .env.backup

# 备份日志
tar -czf logs-$(date +%Y%m%d).tar.gz ~/.pm2/logs/
```

---

## 7. 升级维护

### 7.1 版本升级

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装新依赖
npm install

# 3. 重新编译
npm run build

# 4. 重启服务
pm2 restart dex-api
```

### 7.2 依赖更新

```bash
# 查看过期依赖
npm outdated

# 更新所有依赖
npm update

# 更新特定依赖
npm install @solana/web3.js@latest
```

### 7.3 安全更新

```bash
# 检查安全漏洞
npm audit

# 自动修复
npm audit fix

# 强制修复
npm audit fix --force
```

---

**相关文档**:
- [设计文档](./DESIGN.md)
- [核心设计 - Quote 计算](./CORE_DESIGN_QUOTE.md)
- [API 交付文档](./API_DELIVERY.md)
- [测试文档](./TESTING.md)

---

**文档版本**: 1.0.0  
**最后更新**: 2026-01-15  
**维护者**: 开发团队
