<template>
  <div>
    <h2>管理员面板</h2>
    <n-tabs type="line" animated>
      <n-tab-pane name="stats" tab="统计">
        <n-space vertical>
          <div style="overflow-x: auto;">
            <n-data-table :columns="statsColumns" :data="[stats]" />
          </div>
        </n-space>
      </n-tab-pane>

      <n-tab-pane name="users" tab="用户管理">
        <n-space vertical>
          <n-button @click="fetchUsers" size="large">刷新用户</n-button>
          <div style="overflow-x: auto;">
            <n-data-table :columns="userColumns" :data="users" :pagination="{ pageSize: 10 }" />
          </div>
        </n-space>
      </n-tab-pane>

      <n-tab-pane name="logs" tab="审计日志">
        <n-space vertical>
          <n-button @click="fetchLogs" size="large">刷新日志</n-button>
          <div style="overflow-x: auto;">
            <n-data-table :columns="logColumns" :data="logs" :pagination="{ pageSize: 20 }" />
          </div>
        </n-space>
      </n-tab-pane>

      <n-tab-pane name="messages" tab="消息监控">
        <n-space vertical>
          <n-input v-model:value="keyword" placeholder="关键词筛选" size="large" />
          <n-button @click="fetchMessages" size="large">搜索</n-button>
          <div style="overflow-x: auto;">
            <n-data-table :columns="msgColumns" :data="messages" :pagination="{ pageSize: 20 }" />
          </div>
        </n-space>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios.js';
import { useMessage } from 'naive-ui';

const message = useMessage();

const stats = ref({});
const users = ref([]);
const logs = ref([]);
const messages = ref([]);
const keyword = ref('');

const statsColumns = [
  { title: '总用户数', key: 'users' },
  { title: '活跃用户', key: 'activeUsers' },
  { title: '总消息数', key: 'messages' },
  { title: '总会话数', key: 'conversations' }
];

const userColumns = [
  { title: 'ID', key: 'id' },
  { title: '用户名', key: 'username' },
  { title: '显示名', key: 'displayName' },
  { title: '管理员', key: 'isAdmin', render: row => row.isAdmin ? '是' : '否' },
  { title: '状态', key: 'status' },
  {
    title: '操作',
    key: 'actions',
    render: (row) => {
      return h('n-space', {}, {
        default: () => [
          h('n-button', {
            size: 'small',
            type: row.status === 'active' ? 'warning' : 'success',
            onClick: async () => await toggleUserStatus(row.id, row.status === 'active')
          }, { default: () => row.status === 'active' ? '禁用' : '启用' }),
          h('n-button', {
            size: 'small',
            type: 'info',
            onClick: async () => await resetApiKey(row.id)
          }, { default: () => '重置Key' })
        ]
      });
    }
  }
];

const logColumns = [
  { title: '时间', key: 'createdAt' },
  { title: '管理员', key: 'admin', render: row => row.admin?.username },
  { title: '操作', key: 'action' },
  { title: '目标类型', key: 'targetType' },
  { title: '目标ID', key: 'targetId' },
  { title: '详情', key: 'details' }
];

const msgColumns = [
  { title: '时间', key: 'createdAt' },
  { title: '发送者', key: 'sender', render: row => row.sender?.username },
  { title: '会话ID', key: 'conversationId' },
  { title: '内容预览', key: 'content', render: row => row.content?.slice(0, 50) + '...' }
];

async function fetchStats() {
  const res = await axios.get('/api/v1/admin/stats');
  if (res.data.success) stats.value = res.data.data;
}

async function fetchUsers() {
  const res = await axios.get('/api/v1/users');
  if (res.data.success) users.value = res.data.data;
}

async function fetchLogs() {
  const res = await axios.get('/api/v1/admin/logs');
  if (res.data.success) logs.value = res.data.data;
}

async function fetchMessages() {
  const params = keyword.value ? { keyword: keyword.value } : {};
  const res = await axios.get('/api/v1/admin/messages', { params });
  if (res.data.success) messages.value = res.data.data;
}

async function toggleUserStatus(userId, currentlyActive) {
  const newStatus = currentlyActive ? 'disabled' : 'active';
  await axios.put(`/api/v1/users/${userId}`, { status: newStatus });
  message.success(`用户已${newStatus === 'active' ? '启用' : '禁用'}`);
  await fetchUsers();
}

async function resetApiKey(userId) {
  // 触发创建新 API Key
  await axios.post('/api/v1/auth/keys', { username: userId });
  message.success('新 API Key 已生成，请查看用户详情（此处需额外接口返回 key）');
}

onMounted(() => {
  fetchStats();
  fetchUsers();
  fetchLogs();
  fetchMessages();
});
</script>

<script>
import { h } from 'vue';
export default {
  components: {}
};
</script>