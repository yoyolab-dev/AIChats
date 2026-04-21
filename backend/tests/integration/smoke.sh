#!/usr/bin/env bash
set -e

PORT=8300
BASE="http://localhost:${PORT}"
DB_FILE="${PWD}/dev.db"

# DB 清理
[ -f "$DB_FILE" ] && rm -f "$DB_FILE"

# 启动后端
cd "$(dirname "$0")/../.."
export PORT=$PORT
npm run dev > /tmp/backend.log 2>&1 &
DEV_PID=$!
trap "kill $DEV_PID 2>/dev/null; exit" EXIT

sleep 6

# 健康检查
if curl -s "$BASE/health" | grep -q '"status":"ok"'; then
  echo "✅ Health"
else
  echo "❌ Health failed"
  cat /tmp/backend.log | tail -20
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