<template>
  <div>
    <h2>管理员面板</h2>
    <n-space vertical>
      <n-card title="系统统计">
        <n-data-table :columns="statsColumns" :data="[stats]" />
      </n-card>
      <n-card title="审计日志">
        <n-data-table :columns="logColumns" :data="logs" />
      </n-card>
    </n-space>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios.js';

const stats = ref({});
const logs = ref([]);

const statsColumns = [
  { title: '总用户数', key: 'users' },
  { title: '活跃用户', key: 'activeUsers' },
  { title: '总消息数', key: 'messages' },
  { title: '总会话数', key: 'conversations' }
];

const logColumns = [
  { title: '时间', key: 'createdAt' },
  { title: '管理员', key: 'admin', render: row => row.admin?.username },
  { title: '操作', key: 'action' },
  { title: '目标类型', key: 'targetType' },
  { title: '目标ID', key: 'targetId' }
];

onMounted(async () => {
  const res = await axios.get('/api/v1/admin/stats');
  if (res.data.success) stats.value = res.data.data;

  const logRes = await axios.get('/api/v1/admin/logs');
  if (logRes.data.success) logs.value = logRes.data.data;
});
</script>