const { execSync } = require('child_process');
const fetch = require('node-fetch');

const GITHUB_TOKEN = execSync('gh auth token', { encoding: 'utf-8' }).trim();
const REPO = 'yoyolab-dev/AIChats';
const PROJECT_NUM = 2;

async function ghGraphQL(query, variables = {}) {
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

(async () => {
  try {
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
      (items.nodes || []).map((n) => n.content.number).filter(n => n)
    );
    console.log(`✅ 已关联 ${linkedIssues.size} 个 Issues`);

    const expectedIssues = Array.from({ length: 39 }, (_, i) => 41 + i);
    const toLink = expectedIssues.filter(n => !linkedIssues.has(n));
    console.log(`🔗 需要关联 ${toLink.length} 个新 Issues`);

    for (const issueNum of toLink) {
      try {
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

    console.log('\n✅ Projects 同步完成！');
  } catch (err) {
    console.error('❌ 失败:', err.message);
    process.exit(1);
  }
})();