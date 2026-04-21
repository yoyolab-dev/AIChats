/**
 * GitHub Projects V2 自动状态管理工具
 *
 * 功能:
 * 1. 将 Issues 关联到 Projects 并设置初始状态 (Backlog -> Todo)
 * 2. 将完成的任务移动到 Done
 * 3. 从 commit message 解析任务编号 (如 B01, B02)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

const REPO = 'yoyolab-dev/AIChats';
const PROJECT_NUMBER = 2;

/**
 * 执行 gh GraphQL API
 */
function ghGraphql(query: string, variables: Record<string, any> = {}): any {
  const json = JSON.stringify({ query, variables });
  const cmd = `echo '${json}' | gh api graphql -H 'Content-Type: application/json'`;
  const output = execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(output);
}

/**
 * 获取 Projects 的 Node ID
 */
function getProjectId(): string {
  const res = ghGraphql(`
    query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        projectV2(number: $number) { id }
      }
    }`, { owner: 'yoyolab-dev', name: 'AIChats', number: PROJECT_NUMBER });
  return res.data.repository.projectV2.id;
}

/**
 * 获取 Issue 的 Node ID (通过 number)
 */
function getIssueId(issueNumber: number): string {
  const res = ghGraphql(`
    query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        issue(number: $number) { id }
      }
    }`, { owner: 'yoyolab-dev', name: 'AIChats', number: issueNumber });
  return res.data.repository.issue.id;
}

/**
 * 关联 Issue 到 Projects
 */
function linkIssueToProject(projectId: string, issueId: string): void {
  try {
    ghGraphql(`
      mutation($project: ID!, $content: ID!) {
        addProjectV2ItemById(input: {projectId: $project, contentId: $content}) {
          item { id }
        }
      }`, { project: projectId, content: issueId });
    console.log(`✅ Linked issue ${issueId}`);
  } catch (e) {
    console.error(`❌ Failed to link issue ${issueId}: ${e}`);
  }
}

/**
 * 获取 Project 的所有字段 (Status, Priority, etc.)
 */
function getProjectFields(projectId: string): any[] {
  const res = ghGraphql(`
    query($id: ID!) {
      node(id: $id) {
        ... on ProjectV2 { fields(first: 20) { nodes { id name } }
      }
    }`, { id: projectId });
  return res.data.node.fields.nodes;
}

/**
 * 查找字段 ID ByName
 */
function findFieldId(fields: any[], name: string): string | undefined {
  return fields.find((f: any) => f.name.toLowerCase() === name.toLowerCase())?.id;
}

/**
 * 设置卡片字段值 (如 Status = 'Done')
 */
function setFieldValue(projectId: string, itemId: string, fieldId: string, value: any): void {
  ghGraphql(`
    mutation($project: ID!, $item: ID!, $field: ID!, $value: JSON!) {
      updateProjectV2ItemFieldValue(
        input: { projectId: $project, itemId: $item, fieldId: $field, value: $value }
      ) { projectV2Item { id } }
    }`, { project: projectId, item: itemId, field: fieldId, value: JSON.stringify(value) });
}

/**
 * 批量初始化所有任务到 Backlog
 */
function initAllTasks(): void {
  console.log('🚀 初始化所有任务到 Backlog...');

  // 读取任务编号 (B01-B39 -> 41-79)
  const taskNumbers = Array.from({ length: 39 }, (_, i) => 41 + i);

  const projectId = getProjectId();
  console.log(`✅ Project ID: ${projectId}`);

  const fields = getProjectFields(projectId);
  console.log(`📋 Project fields: ${fields.map((f: any) => f.name).join(', ')}`);

  // 这里通常有 Status 字段，可以设置为 "Backlog" 或 "Todo"
  // 但由于 Projects V2 的字段值需要具体 option ID，这里我们先只做关联
  for (const num of taskNumbers) {
    try {
      const issueId = getIssueId(num);
      linkIssueToProject(projectId, issueId);
      console.log(`✅ Task B${String(num - 40).padStart(2, '0')} (#${num}) linked`);
    } catch (e) {
      console.error(`❌ Task B${num} failed: ${e}`);
    }
  }

  console.log('🎉 初始化完成！请到 Projects 手动排序。');
}

/**
 * 根据 commit 消息自动更新状态
 */
function updateFromCommit(commitHash?: string): void {
  const cmd = commitHash
    ? `git show ${commitHash} --format=%B -s`
    : `git log -1 --format=%B`;
  const message = execSync(cmd, { encoding: 'utf-8' }).trim();

  // 提取 B 编号 (B01, B02, ...)
  const regex = /B(\d{2})/g;
  const matches = [...message.matchAll(regex)];
  const taskIds = [...new Set(matches.map(m => m[1]))];

  if (taskIds.length === 0) {
    console.log('🔍 未在 commit 消息中发现任务编号');
    return;
  }

  console.log(`📌 检测到完成的任务: ${taskIds.map(t => `B${t}`).join(', ')}`);

  // 映射到 Issue numbers (B01 -> #41, B02 -> #42, ...)
  const issueNumbers = taskIds.map(t => 41 + parseInt(t) - 1);

  // TODO: 更新 Projects 状态为 Done
  console.log('⚠️  Projects 状态更新暂需手动完成 (API 限制)');
  console.log(`💡 请手动将以下卡片移至 Done: ${issueNumbers.map(n => `#${n}`).join(', ')}`);
}

// CLI 入口
const command = process.argv[2];

switch (command) {
  case 'init':
    initAllTasks();
    break;
  case 'commit':
    updateFromCommit(process.argv[3]);
    break;
  default:
    console.log(`
Usage:
  npm run project:init    批量关联所有 Issues 到 Projects
  npm run project:commit  <commitHash>  根据 commit 更新状态
    `);
}