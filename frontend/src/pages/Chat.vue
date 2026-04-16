<template>
  <n-space vertical style="height: 90vh">
    <n-space v-if="!currentConversation" vertical style="height: 100%">
      <n-button @click="createConversation" size="large" block>新建会话</n-button>
      <n-list hoverable clickable>
        <n-list-item v-for="conv in conversations" :key="conv.id" @click="selectConversation(conv)" style="padding: 12px 16px;">
          <n-thing :title="conv.id" :description="lastMessagePreview(conv)" />
        </n-list-item>
      </n-list>
    </n-space>

    <n-space v-else vertical style="height: 100%; width: 100%">
      <n-space align="center">
        <n-button @click="currentConversation = null" size="large">返回</n-button>
        <h3>会话: {{ currentConversation.id }}</h3>
      </n-space>

      <n-scrollbar style="max-height: 60vh; overflow-y: auto">
        <n-space vertical>
          <div v-for="msg in messages" :key="msg.id" style="margin-bottom: 8px">
            <strong>{{ msg.sender?.username || 'Unknown' }}:</strong>
            <div v-html="msg.contentHtml" style="margin-left: 8px"></div>
            <n-text depth="3" style="font-size: 12px">{{ formatTime(msg.createdAt) }}</n-text>
          </div>
        </n-space>
      </n-scrollbar>

      <n-space vertical>
        <n-input
          v-model:value="newMessage"
          type="textarea"
          placeholder="输入 Markdown 消息"
          :autosize="{ minRows: 2, maxRows: 4 }"
        />
        <n-button type="primary" @click="sendMessage" :disabled="!newMessage.trim()" block size="large">发送</n-button>
      </n-space>
    </n-space>
  </n-space>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import axios from '@/utils/axios.js';
import { useMessage } from 'naive-ui';

const message = useMessage();
const conversations = ref([]);
const currentConversation = ref(null);
const messages = ref([]);
const newMessage = ref('');

async function loadConversations() {
  const res = await axios.get('/api/v1/conversations');
  if (res.data.success) conversations.value = res.data.data;
}

async function createConversation() {
  // For now, create a conversation with no participants (just self)
  // In real use, you'd select friends
  const res = await axios.post('/api/v1/conversations', { participantIds: [] });
  if (res.data.success) {
    await loadConversations();
    message.success('会话创建成功');
  }
}

async function selectConversation(conv) {
  currentConversation.value = conv;
  await loadMessages(conv.id);
}

async function loadMessages(convId) {
  const res = await axios.get(`/api/v1/conversations/${convId}/messages`);
  if (res.data.success) messages.value = res.data.data;
}

async function sendMessage() {
  if (!currentConversation.value || !newMessage.value.trim()) return;
  await axios.post(`/api/v1/conversations/${currentConversation.value.id}/messages`, {
    content: newMessage.value
  });
  newMessage.value = '';
  await loadMessages(currentConversation.value.id);
  await loadConversations(); // update last message preview
}

function lastMessagePreview(conv) {
  // conv.lastMessage may be null; find from messages if needed
  return '点击查看消息';
}

function formatTime(ts) {
  return new Date(ts).toLocaleString();
}

onMounted(() => {
  loadConversations();
});
</script>