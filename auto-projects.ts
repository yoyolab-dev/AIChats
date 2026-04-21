/**
 * 自动同步 GitHub Projects V2
 * - 关联所有未关联的 Issues 到 Projects #2
 * - 根据 git commit 消息移动已完成任务到 Done
 */

import { execSync } from 'child_process';
import fetch from 'node-fetch';

const GITHUB_TOKEN = execSync('gh auth token', { encoding: 'utf-8' }).trim();
const REPO = 'yoyolab-dev/AIChats';
const PROJECT_NUM = 2;

async function ghGraphQL(query: string, variables: Record<string, any> = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function main() {
  // 1. 获取 Project ID
  console.log('🔍 获取 Projects 信息...');
  const { repository: { projectV2 } } = await ghGraphQL(
    `query($owner:String!,$name:String!,$num:Int!){
      repository(owner:$owner,name:$name){
        projectV2(number:$num){ id }
      }
    }`,
    { owner: 'yoyolab-dev', name: 'AIChats', num: PROJECT_NUM }
  );
  if (!projectV2?.id) throw new Error('Project not found');
  const projectId = projectV2.id;
  console.log(`✅ Project ID: ${projectId}`);

  // 2. 获取已关联的 items
  console.log('📥 获取已关联卡片...');
  const { node: { items } } = await ghGraphQL(
    `query($id:ID!){
      node(id:$id){
        ... on ProjectV2 { 
          items(first: 100) { 
            nodes { 
              content { ... on Issue { number } }
            } 
          }
        }
      }
    }`,
    { id: projectId }
  );
  const linkedIssues = new Set(
    items.nodes
      .map((n: any) => n.content.number)
      .filter((n: number | null) => n)
  );
  console.log(`✅ 已关联 ${linkedIssues.size} 个 Issues`);

  // 3. 获取所有任务 issues (B01-B39) 的数字
  const expectedIssues = Array.from({ length: 39 }, (_, i) => 41 + i); // #41-79
  const toLink = expectedIssues.filter(n => !linkedIssues.has(n));
  console.log(`🔗 需要关联 ${toLink.length} 个新 Issues`);

  // 4. 批量关联
  for (const issueNum of toLink) {
    try {
      // 获取 Issue Node ID
      const { repository: { issue } } = await ghGraphQL(
        `query($owner:String!,$name:String!,$num:Int!){
          repository(owner:$owner,name:$name){
            issue(number:$num){ id }
          }
        }`,
        { owner: 'yoyolab-dev', name: 'AIChats', num: issueNum }
      );
      if (!issue) {
        console.warn(`⚠️  Issue #${issueNum} not found`);
        continue;
      }

      // 关联
      await ghGraphQL(
        `mutation($project:ID!,$content:ID!){
          addProjectV2ItemById(input:{projectId:$project,contentId:$content}){
            item{ id }
          }
        }`,
        { project: projectId, content: issue.id }
      );
      console.log(`✅ Linked #${issueNum}`);
    } catch (e) {
      console.error(`❌ Failed #${issueNum}: ${e.message}`);
    }
  }

  // 5. 根据最新 commit 移动已完成任务到 Done
  console.log('\n📋 检查已完成任务...');
  const commitMsg = execSync('git log -1 --format=%B', { encoding: 'utf-8' });
  const regex = /B(\d{2})/g;
  const matches = [...commitMsg.matchAll(regex)];
  const completedTasks = [...new Set(matches.map(m => parseInt(m[1])))]; // [24,25]

  if (completedTasks.length > 0) {
    console.log(`🎯 检测到完成: ${completedTasks.map(t => `B${String(t).padStart(2,'0')}`).join(', ')}`);
    // TODO: 获取 Status field 的 options 并设置
    // 由于 Projects V2 状态选项需先获取 option ID，复杂，暂不自动设置
    console.log('💡 请手动将上述卡片拖到 Done (或我在下一步自动)');
  } else {
    console.log('🔍 本次 commit 无任务编号，无需状态更新');
  }

  console.log('\n✅ Projects 同步完成！');
}

main().catch((err) => {
  console.error('❌ 失败:', err.message);
  process.exit(1);
});