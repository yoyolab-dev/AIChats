#!/usr/bin/env bash
set -e

# 使用随机端口避免冲突
PORT=$((8300 + RANDOM % 1000))
BASE="http://localhost:${PORT}"
DB_FILE="${PWD}/dev.db"

# DB 清理
[ -f "$DB_FILE" ] && rm -f "$DB_FILE"

# 启动后端
cd "$(dirname "$0")/../.."
export PORT=$PORT
npm run dev > /tmp/backend.log 2>&1 &
DEV_PID=$!
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null; exit' EXIT

sleep 6
# 等待端口就绪
for i in {1..30}; do
  if curl -s "$BASE/health" >/dev/null 2>&1; then break; fi
  # 超时后显示日志
  if [ $i -eq 30 ]; then
    echo "\n❌ Server did not start in time. Last logs:"
    tail -n 50 /tmp/backend.log || true
    exit 1
  fi
  sleep 1
done

# 健康检查
HEALTH=$(curl -s "$BASE/health" || echo '{}')
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "✅ Health"
else
  echo "❌ Health failed: $HEALTH"
  tail -n 30 /tmp/backend.log || true
  exit 1
fi

# Metrics
if curl -s "$BASE/metrics" | grep -q 'http_requests_total'; then
  echo "✅ Metrics"
else
  echo "❌ Metrics failed"
  exit 1
fi

# 注册
REG=$(curl -s -X POST "$BASE/api/v1/users/register" -H "Content-Type: application/json" -d '{"username":"ci","nickname":"CI"}')
API_KEY=$(echo "$REG" | jq -r '.data.apiKey // empty')
if [ -n "$API_KEY" ]; then
  echo "✅ Register"
else
  echo "❌ Register failed: $REG"
  exit 1
fi

# 鉴权
if curl -s "$BASE/api/v1/users/me" -H "Authorization: Bearer $API_KEY" | grep -q '"success":true'; then
  echo "✅ Auth"
else
  echo "❌ Auth failed"
  exit 1
fi

echo "🎉 Smoke tests passed"