<template>
  <div>
    <h2>会话列表</h2>
    <n-list hoverable clickable>
      <n-list-item v-for="conv in conversations" :key="conv.id">
        <n-thing :title="conv.id" :description="`参与者: ${conv.participantIds.join(', ')}`" />
      </n-list-item>
    </n-list>
    <div v-if="currentConversation">
      <h3>当前会话: {{ currentConversation.id }}</h3>
      <div v-for="msg in messages" :key="msg.id">
        <strong>{{ msg.sender.username }}:</strong>
        <div v-html="msg.contentHtml"></div>
      </div>
      <n-input v-model:value="newMessage" type="textarea" placeholder="输入 Markdown 消息" />
      <n-button type="primary" @click="sendMessage">发送</n-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios.js';

const conversations = ref([]);
const messages = ref([]);
const currentConversation = ref(null);
const newMessage = ref('');

async function loadConversations() {
  const res = await axios.get('/api/v1/conversations');
  if (res.data.success) conversations.value = res.data.data;
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
}

onMounted(() => {
  loadConversations();
});
</script>