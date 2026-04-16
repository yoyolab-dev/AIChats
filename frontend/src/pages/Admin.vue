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
          <n-space align="center">
            <n-button type="primary" @click="openCreateUser" size="large">创建用户</n-button>
            <n-button @click="fetchUsers" size="large">刷新列表</n-button>
          </n-space>
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

  <!-- User Form Modal -->
  <n-modal v-model:show="showUserModal" preset="card" :title="editingUser ? '编辑用户' : '创建用户'" style="width: 400px;">
    <n-form>
      <n-form-item label="用户名">
        <n-input v-model:value="userForm.username" placeholder="用户名" />
      </n-form-item>
      <n-form-item label="密码" v-if="!editingUser">
        <n-input v-model:value="userForm.password" type="password" placeholder="密码" />
      </n-form-item>
      <n-form-item label="显示名">
        <n-input v-model:value="userForm.displayName" placeholder="可选" />
      </n-form-item>
      <n-form-item label="管理员">
        <n-switch v-model:value="userForm.isAdmin" />
      </n-form-item>
      <n-form-item label="状态">
        <n-select v-model:value="userForm.status" :options="[{label:'正常',value:'active'},{label:'禁用',value:'disabled'}]"/>
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="showUserModal = false">取消</n-button>
        <n-button type="primary" @click="saveUser">保存</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, onMounted, h } from 'vue';
import axios from '@/utils/axios.js';
import { useMessage, useDialog } from 'naive-ui';

const message = useMessage();
const dialog = useDialog();

const stats = ref({});
const users = ref([]);
const logs = ref([]);
const messages = ref([]);
const keyword = ref('');
const userForm = ref({ username: '', password: '', isAdmin: false, status: 'active' });
const editingUser = ref(null);
const showUserModal = ref(false);

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
  { title: '创建时间', key: 'createdAt' },
  {
    title: '操作',
    key: 'actions',
    render: (row) => {
      return h('n-space', {}, {
        default: () => [
          h('n-button', {
            size: 'small',
            type: 'primary',
            onClick: () => openEditUser(row)
          }, { default: () => '编辑' }),
          h('n-button', {
            size: 'small',
            type: 'error',
            onClick: () => confirmDeleteUser(row.id)
          }, { default: () => '删除' })
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
  const res = await axios.get('/api/v1/admin/users');
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

function openCreateUser() {
  editingUser.value = null;
  userForm.value = { username: '', password: '', isAdmin: false, status: 'active' };
  showUserModal.value = true;
}

function openEditUser(row) {
  editingUser.value = row.id;
  userForm.value = {
    username: row.username,
    password: '', // 密码留空表示不修改
    isAdmin: row.isAdmin,
    status: row.status
  };
  showUserModal.value = true;
}

async function saveUser() {
  try {
    if (editingUser.value) {
      // Update
      const { username, isAdmin, status } = userForm.value;
      await axios.put(`/api/v1/admin/users/${editingUser.value}`, { username, isAdmin, status });
      message.success('用户已更新');
    } else {
      // Create
      const { username, password, isAdmin, status } = userForm.value;
      if (!username || !password) {
        message.error('用户名和密码必填');
        return;
      }
      const res = await axios.post('/api/v1/admin/users', { username, password, isAdmin, status });
      if (res.data.success) {
        message.success(`用户创建成功，请保存 API Key: ${res.data.data.apiKey}`);
      }
    }
    showUserModal.value = false;
    await fetchUsers();
  } catch (e) {
    message.error(e.response?.data?.error || '操作失败');
  }
}

function confirmDeleteUser(userId) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除该用户吗？此操作将软删除（禁用账号），无法恢复。',
    positiveText: '删除',
    onPositive: async () => {
      try {
        await axios.delete(`/api/v1/admin/users/${userId}`);
        message.success('用户已删除');
        await fetchUsers();
      } catch (e) {
        message.error(e.response?.data?.error || '删除失败');
      }
    }
  });
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