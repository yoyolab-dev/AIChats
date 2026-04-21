#!/usr/bin/env bash
set -e

PROJECT_NUMBER=2
TASK_FILE="/tmp/task-cards.json"

echo "🚀 开始导入任务卡片到 Projects #${PROJECT_NUMBER}..."

if ! gh project view "$PROJECT_NUMBER" >/dev/null 2>&1; then
  echo "❌ Projects #${PROJECT_NUMBER} 不存在"
  exit 1
fi

COUNT=0
while IFS= read -r TITLE; do
  echo "📝 创建卡片: $TITLE"
  gh project item-create "$PROJECT_NUMBER" --owner yoyolab-dev --repo AIChats --title "$TITLE" >/dev/null
  COUNT=$((COUNT + 1))
done < <(jq -r '.[]' "$TASK_FILE")

echo "✅ 完成！共导入 $COUNT 个任务卡片到 Projects #${PROJECT_NUMBER}"