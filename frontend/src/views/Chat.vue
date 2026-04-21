<template>
  <n-space v-if="friendId" vertical style="height: 80vh;">
    <n-space align="center" justify="space-between">
      <n-h3>{{ friendName }}</n-h3>
      <n-text depth="3">Online: {{ isOnline ? '🟢' : '⚪' }}</n-text>
    </n-space>

    <!-- 消息列表 -->
    <n-scrollbar style="flex: 1; border: 1px solid #eee; border-radius: 8px; padding: 12px;" :native-scrollbar="false">
      <n-space vertical>
        <div v-for="msg in messages" :key="msg.id" :style="{ textAlign: msg.senderId === myId ? 'right' : 'left' }">
          <n-card size="small" :class="msg.senderId === myId ? 'sent' : 'received'" hoverable>
            <n-text>{{ msg.content }}</n-text>
            <template #footer>
              <n-text depth="3" :style="{ fontSize: '10px' }">
                {{ formatTime(msg.createdAt) }}
              </n-text>
            </template>
          </n-card>
        </div>
      </n-space>
    </n-scrollbar>

    <!-- 输入区 -->
    <n-space align="center">
      <n-input v-model:value="input" placeholder="Type a message..." @keyup.enter="send" :disabled="sending" />
      <n-button type="primary" :loading="sending" @click="send">Send</n-button>
    </n-space>
  </n-space>

  <n-empty v-else description="Select a friend from the Friends page to start chatting." />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api/client'
import { useMessage } from 'naive-ui'

const route = useRoute()
const authStore = useAuthStore()
const messageApi = useMessage()

const friendId = computed(() => route.query.friend as string)
const myId = computed(() => 'TODO_me_id') // will be replaced when endpoint returns my id in payload
const friendName = ref('Chat')
const isOnline = ref(false) // TODO: WS presence

const messages = ref<any[]>([])
const input = ref('')
const sending = ref(false)
let ws: WebSocket | null = null

async function loadHistory() {
  try {
    const res = await api.getPrivateHistory(friendId.value, 50)
    messages.value = res.messages.reverse() // newest at bottom
    friendName.value = res.messages[0]?.sender?.username || 'Chat'
  } catch (e: any) {
    messageApi.error(e.message)
  }
}

async function send() {
  if (!input.value.trim() || !friendId.value) return
  sending.value = true
  try {
    const msg = await api.sendPrivateMessage(friendId.value, input.value.trim())
    messages.value.push(msg)
    input.value = ''
  } catch (e: any) {
    messageApi.error(e.message)
  } finally {
    sending.value = false
  }
}

// Basic WebSocket: connect and listen for 'message' events
function connectWS() {
  if (!authStore.apiKey) return
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const wsUrl = `${protocol}://${window.location.host}/ws`
  ws = new WebSocket(wsUrl)
  ws.onopen = () => {
    console.log('WS connected')
    // auth handshake optional if server uses cookie? We'll rely on token not needed because request.user from auth via header not WS.
    // Our server uses query? It uses request.user preHandler which checks Authorization header from initial WS HTTP request.
    // In browser WS, cannot set headers. We'll need to pass token in query and validate manually on server later. For now skip.
  }
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'message' && data.payload) {
        const msg = data.payload.message
        // If message is from current friend, add to list
        if (msg.senderId === friendId.value || msg.receiverId === friendId.value) {
          messages.value.push(msg)
        }
      }
    } catch (e) {}
  }
}

watch(friendId, (newId) => {
  if (newId) {
    loadHistory()
  }
})

onMounted(() => {
  if (friendId.value) loadHistory()
  // connectWS() // TODO: server WS auth via header requires custom handshake; pause for now
})

onUnmounted(() => {
  ws?.close()
})
</script>

<style scoped>
.sent {
  background-color: #e6f7ff;
  text-align: right;
}
.received {
  background-color: #f5f5f5;
}
.ml-2 { margin-left: 8px; }
</style>