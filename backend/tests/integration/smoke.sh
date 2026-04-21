#!/usr/bin/env bash
set -e

# 使用高端口随机范围
PORT=$((9000 + RANDOM % 1000))
BASE="http://localhost:${PORT}"
DB_FILE="${PWD}/dev.db"

echo "🧪 Smoke test starting on port $PORT"

# 清理数据库
if [ -f "$DB_FILE" ]; then
  echo "🗑️  Removing existing DB..."
  rm -f "$DB_FILE"
fi

# 启动后端
cd "$(dirname "$0")/../.."
export PORT=$PORT
npm run dev > /tmp/backend.log 2>&1 &
DEV_PID=$!
trap "kill $DEV_PID 2>/dev/null; exit" EXIT

# 等待启动（最多 40 秒）
STARTED=0
for i in {1..40}; do
  if curl -s "$BASE/health" >/dev/null 2>&1; then
    STARTED=1
    echo "✅ Server ready"
    break
  fi
  sleep 1
done

if [ $STARTED -ne 1 ]; then
  echo "❌ Server failed to start within 40s"
  echo "--- Last 30 lines of log ---"
  tail -n 30 /tmp/backend.log 2>/dev/null || echo "No log"
  exit 1
fi

# 1. Health
HEALTH=$(curl -s "$BASE/health" || echo '{}')
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "✅ Health OK"
else
  echo "❌ Health check failed: $HEALTH"
  exit 1
fi

# 2. Metrics
if curl -s "$BASE/metrics" | grep -q 'http_requests_total'; then
  echo "✅ Metrics OK"
else
  echo "❌ Metrics not available"
  exit 1
fi

# 3. Register
REG=$(curl -s -X POST "$BASE/api/v1/users/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"smoke_user","nickname":"Smoke"}')
API_KEY=$(echo "$REG" | jq -r '.data.apiKey // empty')
if [ -n "$API_KEY" ]; then
  echo "✅ Register OK"
else
  echo "❌ Register failed: $REG"
  exit 1
fi

# 4. Auth
if curl -s "$BASE/api/v1/users/me" -H "Authorization: Bearer $API_KEY" | grep -q '"success":true'; then
  echo "✅ Auth OK"
else
  echo "❌ Auth failed"
  exit 1
fi

echo ""
echo "🎉 All smoke tests passed!"
exit 0