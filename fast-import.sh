#!/usr/bin/env bash
set -euo pipefail

REPO="yoyolab-dev/AIChats"
PROJECT_NUM=2
TASK_FILE="/tmp/task-cards.json"

echo "🚀 批量导入 Project 卡片..."

# 批量创建 Issues 并收集 numbers
declare -a ISSUE_NUMS
while IFS= read -r TITLE; do
  NUM=$(gh issue create --repo "$REPO" --title "$TITLE" --body "Task" --label "task" --json number 2>/dev/null | jq -r '.number')
  if [[ -n "$NUM" && "$NUM" != "null" ]]; then
    echo "✅ Issue #$NUM: $TITLE"
    ISSUE_NUMS+=("$NUM")
  else
    echo "❌ 创建失败: $TITLE"
  fi
done < <(jq -r '.[]' "$TASK_FILE")

echo "📊 共创建 ${#ISSUE_NUMS[@]} 个 Issues"

# 获取 Project ID
PROJECT_ID=$(gh api graphql -f query='
  query($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      projectV2(number: $number) { id }
    }
  }' -f owner="yoyolab-dev" -f name="AIChats" -f number="${PROJECT_NUM}" | jq -r '.data.repository.projectV2.id // empty')

if [[ -z "$PROJECT_ID" ]]; then
  echo "❌ 无法获取 Project ID"
  echo "💡 手动在 https://github.com/yoyolab-dev/AIChats/projects/2 检查"
  exit 1
fi
echo "✅ Project ID: $PROJECT_ID"

# 批量关联 Issues 到 Project
for NUM in "${ISSUE_NUMS[@]}"; do
  # 获取 Issue node ID
  ISSUE_ID=$(gh issue view "$NUM" --repo "$REPO" --json id -q '.id')
  if [[ -n "$ISSUE_ID" ]]; then
    gh api graphql -f query='
      mutation($project: ID!, $item: ID!) {
        addProjectV2ItemById(input: {projectId: $project, contentId: $item}) {
          item { id }
        }
      }' -f project="$PROJECT_ID" -f item="$ISSUE_ID" >/dev/null 2>&1 && \
      echo "🔗 Issue #$NUM 已关联"
  fi
done

echo "🎉 完成！现在访问 Projects 查看卡片"