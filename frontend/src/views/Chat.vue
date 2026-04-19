<template>
  <n-space vertical :size="20" style="height: calc(100vh - 150px);">
    <!-- 好友列表 -->
    <n-card title="好友列表" size="small">
      <n-list hoverable clickable v-if="friends.length">
        <n-list-item v-for="friend in friends" :key="friend.otherUserId" @click="selectFriend(friend.otherUserId)">
          <n-space align="center">
            <n-avatar round :size="40" :src="friend.otherUser.avatar" />
            <div>
              <div>{{ friend.otherUser.nickname || friend.otherUser.username }}</div>
              <n-text depth="3" size="12">{{ friend.status }}</n-text>
            </div>
          </n-space>
        </n-list-item>
      </n-list>
      <n-empty v-else description="暂无好友" />
    </n-card>

    <!-- 消息区域 -->
    <n-card v-if="selectedFriendId" title="聊天">
      <div ref="msgContainer" style="height: 300px; overflow-y: auto;">
        <div v-for="msg in messages" :key="msg.id" style="margin-bottom: 12px; display: flex; align-items: flex-start;">
          <n-avatar round :size="36" :src="msg.sender.avatar" style="margin-right: 8px;" />
          <div>
            <n-text depth="3" size="12">{{ msg.sender.nickname || msg.sender.username }}</n-text>
            <div>{{ msg.content }}</div>
            <n-text depth="3" size="12">{{ formatTime(msg.createdAt) }}</n-text>
          </div>
        </div>
      </div>
      <n-input-group>
        <n-input v-model:value="newMessage" placeholder="输入消息..." @keyup.enter="sendMessage" />
        <n-button type="primary" @click="sendMessage" :loading="sending" :disabled="!newMessage.trim()">发送</n-button>
      </n-input-group>
    </n-card>
  </n-space>
</template>

<script setup>
import { ref, onMounted, nextTick, inject } from 'vue';
import { useMessage } from 'naive-ui';
import { NConfigProvider, NLayout, NLayoutHeader, NLayoutContent, NSpace, NText, NTag, NButton, NCard, NList, NListItem, NA, NAvatar, NEmpty, NInput, NInputGroup } from 'naive-ui';

const http = inject('http');
const notify = useMessage();

const friends = ref([]);
const selectedFriendId = ref(null);
const messages = ref([]);
const newMessage = ref('');
const sending = ref(false);
const msgContainer = ref(null);

async function fetchFriends() {
  try {
    const res = await http.get('/friends');
    friends.value = res.data.friendships;
  } catch (e) {
    console.error(e);
    notify.error('获取好友列表失败');
  }
}

async function selectFriend(userId) {
  selectedFriendId.value = userId;
  await fetchMessages();
}

async function fetchMessages() {
  if (!selectedFriendId.value) return;
  try {
    const res = await http.get('/messages', { params: { withUser: selectedFriendId.value } });
    messages.value = res.data.messages;
    scrollToBottom();
  } catch (e) {
    console.error(e);
    notify.error('获取消息失败');
  }
}

async function sendMessage() {
  if (!newMessage.value.trim()) return;
  sending.value = true;
  try {
    await http.post('/messages', {
      receiverId: selectedFriendId.value,
      content: newMessage.value.trim()
    });
    newMessage.value = '';
    await fetchMessages();
  } catch (e) {
    console.error(e);
    notify.error('发送失败');
  } finally {
    sending.value = false;
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (msgContainer.value) {
      msgContainer.value.scrollTop = msgContainer.value.scrollHeight;
    }
  });
}

function formatTime(iso) {
  const date = new Date(iso);
  return date.toLocaleString();
}

onMounted(() => {
  fetchFriends();
});
</script>

<style scoped>
</style>
