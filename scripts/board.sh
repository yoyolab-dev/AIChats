#!/usr/bin/env bash
# board.sh — AIChats 项目管理看板快捷操作脚本
# 用法:
#   ./scripts/board.sh status <issue-number> <状态值>
#   ./scripts/board.sh priority <issue-number> <P0|P1|P2>
#   ./scripts/board.sh size <issue-number> <XS|S|M|L|XL>
#   ./scripts/board.sh estimate <issue-number> <数值>
#   ./scripts/board.sh target <issue-number> <YYYY-MM-DD>
#   ./scripts/board.sh start <issue-number> <YYYY-MM-DD>
#   ./scripts/board.sh list [状态值]
#   ./scripts/board.sh add <issue-url>
#   ./scripts/board.sh remove <issue-number>

set -euo pipefail

PROJECT_NUM=2
PROJECT_OWNER="yoyolab-dev"
PROJECT_ID="PVT_kwHOEGdgvM4BUnVb"
REPO="yoyolab-dev/AIChats"

# ── 字段 ID 映射 ──
declare -A FIELD_ID=(
  [Status]="PVTSSF_lAHOEGdgvM4BUnVbzhBuTW8"
  [Priority]="PVTSSF_lAHOEGdgvM4BUnVbzhBuT60"
  [Size]="PVTSSF_lAHOEGdgvM4BUnVbzhBuT64"
  [Estimate]="PVTF_lAHOEGdgvM4BUnVbzhBuT68"
  [Start date]="PVTF_lAHOEGdgvM4BUnVbzhBuT7A"
  [Target date]="PVTF_lAHOEGdgvM4BUnVbzhBuT7E"
)

# ── 单选字段选项 ID 映射 ──
declare -A STATUS_OPTIONS=(
  [Backlog]="f75ad846"
  [Ready]="61e4505c"
  ["In progress"]="47fc9ee4"
  ["In review"]="df73e18b"
  [Done]="98236657"
)

declare -A PRIORITY_OPTIONS=(
  [P0]="79628723"
  [P1]="0a877460"
  [P2]="da944a9c"
)

declare -A SIZE_OPTIONS=(
  [XS]="6c6483d2"
  [S]="f784b110"
  [M]="7515a9f1"
  [L]="817d0097"
  [XL]="db339eb2"
)

# ── 辅助函数 ──

get_item_id() {
  local issue_num="$1"
  gh project item-list "$PROJECT_NUM" --owner "$PROJECT_OWNER" --format json \
    | jq -r --argjson num "$issue_num" '.items[] | select(.content.number == $num) | .id'
}

edit_single_select() {
  local field_name="$1" issue_num="$2" option_name="$3"
  local -n opts="${field_name}_OPTIONS"

  local option_id="${opts[$option_name]:-}"
  if [[ -z "$option_id" ]]; then
    echo "❌ 无效选项: $option_name (可选: ${!opts[@]})" >&2
    return 1
  fi

  local item_id
  item_id=$(get_item_id "$issue_num")
  if [[ -z "$item_id" ]]; then
    echo "❌ Issue #$issue_num 不在看板中，先执行: board.sh add <issue-url>" >&2
    return 1
  fi

  local field_id="${FIELD_ID[$field_name]}"
  gh project item-edit \
    --id "$item_id" \
    --project-id "$PROJECT_ID" \
    --field-id "$field_id" \
    --single-select-option-id "$option_id" \
    2>&1

  echo "✅ Issue #$issue_num 的 $field_name 已设为: $option_name"
}

edit_number() {
  local field_name="$1" issue_num="$2" value="$3"
  local item_id
  item_id=$(get_item_id "$issue_num")
  if [[ -z "$item_id" ]]; then
    echo "❌ Issue #$issue_num 不在看板中" >&2
    return 1
  fi

  local field_id="${FIELD_ID[$field_name]}"
  gh project item-edit \
    --id "$item_id" \
    --project-id "$PROJECT_ID" \
    --field-id "$field_id" \
    --number-value "$value" \
    2>&1

  echo "✅ Issue #$issue_num 的 $field_name 已设为: $value"
}

edit_date() {
  local field_name="$1" issue_num="$2" value="$3"
  local item_id
  item_id=$(get_item_id "$issue_num")
  if [[ -z "$item_id" ]]; then
    echo "❌ Issue #$issue_num 不在看板中" >&2
    return 1
  fi

  local field_id="${FIELD_ID[$field_name]}"
  gh project item-edit \
    --id "$item_id" \
    --project-id "$PROJECT_ID" \
    --field-id "$field_id" \
    --date "$value" \
    2>&1

  echo "✅ Issue #$issue_num 的 $field_name 已设为: $value"
}

list_items() {
  local filter="${1:-}"
  local jq_filter
  if [[ -n "$filter" ]]; then
    jq_filter=".items[] | select(.status.name == \"$filter\")"
  else
    jq_filter=".items[]"
  fi

  gh project item-list "$PROJECT_NUM" --owner "$PROJECT_OWNER" --format json \
    | jq -r "$jq_filter | \"#\(.content.number // \"—\") \(.content.title // \"—\") | Status: \(.status.name // \"—\") | Priority: \(.priority.name // \"—\") | Size: \(.size.name // \"—\")\""
}

# ── 主逻辑 ──

cmd="${1:-help}"

case "$cmd" in
  status)
    edit_single_select Status "$2" "$3"
    ;;
  priority)
    edit_single_select Priority "$2" "$3"
    ;;
  size)
    edit_single_select Size "$2" "$3"
    ;;
  estimate)
    edit_number Estimate "$2" "$3"
    ;;
  target)
    edit_date "Target date" "$2" "$3"
    ;;
  start)
    edit_date "Start date" "$2" "$3"
    ;;
  list)
    list_items "${2:-}"
    ;;
  add)
    gh project item-add "$PROJECT_NUM" --owner "$PROJECT_OWNER" --url "$2"
    echo "✅ 已添加到看板"
    ;;
  remove)
    local item_id
    item_id=$(get_item_id "$2")
    if [[ -z "$item_id" ]]; then
      echo "❌ Issue #$2 不在看板中" >&2
      exit 1
    fi
    gh project item-delete "$item_id" --project-id "$PROJECT_ID"
    echo "✅ Issue #$2 已从看板移除"
    ;;
  help|*)
    cat <<EOF
📋 AIChats 看板操作脚本

用法: $0 <命令> [参数]

命令:
  status    <issue#> <Backlog|Ready|In progress|In review|Done>
  priority  <issue#> <P0|P1|P2>
  size      <issue#> <XS|S|M|L|XL>
  estimate  <issue#> <数值>
  target    <issue#> <YYYY-MM-DD>   设置目标日期
  start     <issue#> <YYYY-MM-DD>   设置开始日期
  list      [状态值]                 列出看板卡片（可按状态过滤）
  add       <issue-url>             添加 Issue 到看板
  remove    <issue#>                从看板移除 Issue

示例:
  $0 status 12 "In progress"
  $0 priority 12 P0
  $0 size 12 M
  $0 estimate 12 8
  $0 target 12 2026-05-01
  $0 list
  $0 list "In progress"
  $0 add https://github.com/yoyolab-dev/AIChats/issues/12
  $0 remove 12
EOF
    ;;
esac
