#!/bin/bash

echo "🧪 Running All Tests"
echo "===================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
PASSED=0
FAILED=0

# 运行测试函数
run_test() {
  local test_name=$1
  local test_command=$2
  
  echo -e "${YELLOW}Running: $test_name${NC}"
  if eval "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
  fi
  echo ""
}

# 1. 单元测试
echo "📦 Unit Tests"
echo "-------------"
run_test "Quote Calculation" "npm run test:unit"
run_test "Native Quotes" "npm run test:unit:native"
echo ""

# 2. 集成测试 (需要 API 服务运行)
echo "🔗 Integration Tests (需要 API 服务运行)"
echo "----------------------------------------"
run_test "Jupiter API" "npm run test:api:jupiter"
run_test "Accurate Quote API" "npm run test:api:quote"
echo ""

# 3. 市场测试
echo "🏪 Market Tests (需要 API 服务运行)"
echo "-----------------------------------"
run_test "PumpFun Market" "npm run test:market:pumpfun"
run_test "PumpSwap Market" "npm run test:market:pumpswap"
run_test "Raydium CPMM Market" "npm run test:market:raydium"
echo ""

# 4. E2E 测试 (需要私钥配置)
echo "🎯 E2E Tests (需要配置 PRIVATE_KEY)"
echo "-----------------------------------"
run_test "Swap Flow" "npm run test:e2e"
echo ""

# 总结
echo "===================="
echo "📊 Test Summary"
echo "===================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed${NC}"
  exit 1
fi
