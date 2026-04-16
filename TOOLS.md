# TOOLS.md - 本地笔记

技能定义**工具如何工作**。这个文件是**你的** specifics——那些独特的设置。

## 这里放什么

像：

- 相机名称和位置
- SSH 主机和别名
- TTS 的首选语音
- 扬声器/房间名称
- 设备昵称
- 任何特定环境的东西
- GitHub 项目管理命令

## 例子

```markdown
### 相机

- living-room → 主区域，180° 广角
- front-door → 入口，运动触发

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- 首选语音："Nova"（温暖，略带英国口音）
- 默认扬声器：厨房 HomePod

### GitHub 项目管理

仓库: `yoyolab-dev/AIDiscussion`

```bash
# 查看 Project 卡片
gh project view --owner yoyolab-dev --project 1

# 创建 Issue
gh issue create -R yoyolab-dev/AIDiscussion -t "BUG: 描述" -b "详细描述" -l bug

# 创建 Draft Issue 到 Project (自动关联)
gh api graphql -f query='mutation($p:ID!,$t:String!,$b:String!){addProjectV2DraftIssue(input:{projectId:$p,title:$t,body:$b}){projectItem{id}}}' -f p=PVT_kwHOEGdgvM4BUTSk -f t="标题" -f b="内容"

# 更新卡片状态
# 需要 itemId (如 PVTI_xxx) 和 fieldId (Status: PVTSSF_lAHOEGdgvM4BUTSkzhBcbss)
# 选项: Backlog(97439a), Ready(61e4505c), In progress(47fc9ee4), In review(df73e18b), Done(98236657)
```

*将敏感 Token 存储在 `~/.config/gh/hosts.yml` 中，勿硬编码。*
```

```markdown
### 相机

- living-room → 主区域，180° 广角
- front-door → 入口，运动触发

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- 首选语音："Nova"（温暖，略带英国口音）
- 默认扬声器：厨房 HomePod
```

## 为什么分开？

技能是共享的。你的设置是你的。分开意味着你可以在不丢失笔记的情况下更新技能，并且在不泄露基础设施的情况下分享技能。

---

加上任何帮助你工作的东西。这是你的便签。
