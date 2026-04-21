#!/usr/bin/env bash
set -e

REPO="yoyolab-dev/AIChats"
TASK_FILE="/tmp/task-cards.json"

echo "🚀 批量创建 GitHub Issues..."

COUNT=0
while IFS= read -r TITLE; do
  NUM=$(gh issue create --repo "$REPO" --title "$TITLE" --body "Task from AIChats project automation" --json number 2>/dev/null | jq -r '.number // empty')
  if [[ -n "$NUM" ]]; then
    echo "✅ #$NUM: $TITLE"
    COUNT=$((COUNT+1))
  else
    echo "❌ Failed: $TITLE"
  fi
done < <(jq -r '.[]' "$TASK_FILE")

echo "🎉 完成！共创建 $COUNT 个 Issues"
echo "💡 手动导入 Projects:"
echo "   1. 打开 https://github.com/yoyolab-dev/AIChats/projects/2"
echo "   2. 切换到 Backlog 视图"
echo "   3. 在 Issues 标签页找到这些 Issues，批量拖拽到 Backlog"