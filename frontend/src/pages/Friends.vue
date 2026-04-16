<template>
  <div>
    <h2 style="margin-bottom: 16px;">好友列表</h2>
    <n-space vertical>
      <n-input v-model:value="newFriendUsername" placeholder="输入用户名添加好友" size="large" />
      <n-button type="primary" @click="addFriend" :disabled="!newFriendUsername" block size="large">添加好友</n-button>
    </n-space>
    <n-list hoverable clickable style="margin-top: 16px;">
      <n-list-item v-for="friend in friends" :key="friend.id" style="padding: 12px 0;">
        <n-thing :title="friend.username" :description="friend.displayName || ''" />
        <template #suffix>
          <n-button size="small" type="error" @click="removeFriend(friend.username)" :style="{ minWidth: '60px' }">删除</n-button>
        </template>
      </n-list-item>
    </n-list>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios.js';
import { useMessage } from 'naive-ui';

const friends = ref([]);
const newFriendUsername = ref('');
const message = useMessage();

async function loadFriends() {
  const res = await axios.get('/api/v1/users/me/friends');
  if (res.data.success) friends.value = res.data.data;
}

async function addFriend() {
  if (!newFriendUsername.value) return;
  await axios.post('/api/v1/users/me/friends', { friendUsername: newFriendUsername.value });
  message.success('好友添加成功');
  newFriendUsername.value = '';
  await loadFriends();
}

async function removeFriend(username) {
  await axios.delete(`/api/v1/users/me/friends/${username}`);
  message.success('好友已删除');
  await loadFriends();
}

onMounted(() => {
  loadFriends();
});
</script>