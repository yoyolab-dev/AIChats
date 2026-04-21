const https = require('https');
const { execSync } = require('child_process');

const REPO = 'yoyolab-dev/AIChats';
const PROJECT_NUM = 2;
const TOKEN = execSync('gh auth token', { encoding: 'utf-8' }).trim();

function ghGraphQL(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    const url = `https://api.github.com/graphql`;
    const options = {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OpenClaw',
      },
    };

    https.request(url, {
      ...options,
      method: 'POST',
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.errors) reject(new Error(JSON.stringify(json.errors)));
          else resolve(json.data);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).write(data).end();
  });
}

async function main() {
  try {
    // 1. 获取 Projects ID
    console.log('🔍 获取 Projects ID...');
    const { repository: { projectV2 } } = await ghGraphQL(
      `query($owner:String!,$name:String!,$num:Int!){
        repository(owner:$owner,name:$name){
          projectV2(number:$num){ id }
        }
      }`,
      { owner: 'yoyolab-dev', name: 'AIChats', num: PROJECT_NUM }
    );
    if (!projectV2) throw new Error('Project not found');
    const projectId = projectV2.id;
    console.log(`✅ Project ID: ${projectId}`);

    // 2. 获取所有 Issues (B01-B39 -> #41-79)
    console.log('📥 获取 Issues...');
    const issueNumbers = Array.from({ length: 39 }, (_, i) => 41 + i);
    const issueIds = {};
    for (const num of issueNumbers) {
      try {
        const { repository: { issue } } = await ghGraphQL(
          `query($owner:String!,$name:String!,$num:Int!){
            repository(owner:$owner,name:$name){
              issue(number:$num){ id }
            }
          }`,
          { owner: 'yoyolab-dev', name: 'AIChats', num }
        );
        if (issue) issueIds[num] = issue.id;
      } catch (e) {
        console.warn(`⚠️  Issue #${num} skip: ${e.message}`);
      }
    }
    console.log(`✅ 获取 ${Object.keys(issueIds).length} 个 Issues`);

    // 3. 关联所有 Issues 到 Project
    console.log('🔗 关联 Issues 到 Projects...');
    for (const [num, issueId] of Object.entries(issueIds)) {
      try {
        await ghGraphQL(
          `mutation($project:ID!,$content:ID!){
            addProjectV2ItemById(input:{projectId:$project,contentId:$content}){
              item{ id }
            }
          }`,
          { project: projectId, content: issueId }
        );
        console.log(`✅ #${num} linked`);
      } catch (e) {
        console.error(`❌ #${num} failed: ${e.message}`);
      }
    }
    console.log('🎉 关联完成！');

    // 4. 获取 Project fields (找 Status 字段)
    console.log('📋 获取 Project fields...');
    const { node: { fields } } = await ghGraphQL(
      `query($id:ID!){
        node(id:$id){
          ... on ProjectV2 { fields(first:20){ nodes{ id name } } }
        }
      }`,
      { id: projectId }
    );
    console.log(`Fields: ${fields.nodes.map((f: any) => f.name).join(', ')}`);

    // 5. 找出 "Done" option ID (直接在 UI 拖拽一次即可，API 获取 option 较复杂)
    console.log('💡 现在请手动在 GitHub UI 中将 B24-B25 移动到 Done 列');
    console.log(`   Projects: https://github.com/${REPO}/projects/2`);

  } catch (error) {
    console.error('❌ 失败:', error.message);
    process.exit(1);
  }
}

main();