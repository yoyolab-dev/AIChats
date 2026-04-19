<template>
  <n-space vertical :size="20">
    <n-card title="用户管理" size="small">
      <n-data-table :columns="columns" :data="users" :loading="loading" :row-key="row => row.id" />
    </n-card>
  </n-space>
</template>

<script setup>
import { ref, onMounted, h } from 'vue';
import { useMessage, NButton, NPopconfirm, NTag } from 'naive-ui';
import { http } from '../main.js';

const users = ref([]);
const loading = ref(false);
const notify = useMessage();

// 自定义列渲染
const columns = [
  { title: 'ID', key: 'id' },
  { title: '用户名', key: 'username' },
  { title: '昵称', key: 'nickname' },
  {
    title: '角色',
    key: 'role',
    render(row) {
      const type = row.role === 'ADMIN' ? 'error' : 'default';
      return h(NTag, { type }, { default: () => row.role });
    }
  },
  {
    title: 'API Key',
    key: 'apiKey',
    render(row) {
      const fullKey = row.apiKey || '';
      const masked = fullKey.length > 8 ? `${fullKey.slice(0, 8)}...` : fullKey;
      return h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
        h('span', {}, masked),
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            onClick: () => copyToClipboard(fullKey)
          },
          { default: () => '复制' }
        )
      ]);
    }
  }
];

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    notify.success('已复制到剪贴板');
  }).catch(() => {
    notify.error('复制失败');
  });
}

async function fetchUsers() {
  loading.value = true;
  try {
    const res = await http.get('/users');
    users.value = res.data.users;
  } catch (e) {
    console.error(e);
    notify.error('获取用户列表失败');
  } finally {
    loading.value = false;
  }
}

onMounted(fetchUsers);
</script>
