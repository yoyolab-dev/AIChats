#!/usr/bin/env bash
set -e

PORT=8201
BASE="http://localhost:${PORT}"
LOG="/tmp/flow.log"

# 启动后端
cd "$(dirname "$0")/../.."
npm run dev > "$LOG" 2>&1 &
DEV_PID=$!
trap "kill $DEV_PID 2>/dev/null" EXIT

# 等待服务就绪
for i in {1..40}; do
  if curl -s "$BASE/health" >/dev/null 2>&1; then
    echo "✅ Server ready on port $PORT"
    break
  fi
  sleep 1
done

# 1. 健康检查
curl -s "$BASE/health" | grep -q '"status":"ok"' && echo "✅ Health OK"

# 2. /metrics 暴露
curl -s "$BASE/metrics" | grep -q 'http_requests_total' && echo "✅ Metrics OK"

# 3. 用户注册
RESP=$(curl -s -X POST "$BASE/api/v1/users/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","nickname":"Test User"}')
API_KEY=$(echo "$RESP" | jq -r '.data.apiKey // empty')
if [ -n "$API_KEY" ]; then
  echo "✅ Registered, got API key"
else
  echo "❌ Registration failed: $RESP"
  exit 1
fi

# 4. /users/me 鉴权
ME=$(curl -s "$BASE/api/v1/users/me" -H "Authorization: Bearer $API_KEY")
echo "$ME" | grep -q '"success":true' && echo "✅ Auth works"

echo ""
echo "🎉 Core API integration verified."