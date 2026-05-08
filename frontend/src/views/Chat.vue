<template>
  <!-- 私聊模式 -->
  <n-space v-if="friendId" vertical style="height: 80vh;">
    <n-space align="center" justify="space-between">
      <n-h3>{{ friendName }}</n-h3>
      <n-text depth="3">Private Chat</n-text>
    </n-space>

    <n-scrollbar style="flex: 1; border: 1px solid #eee; border-radius: 8px; padding: 12px;" :native-scrollbar="false">
      <n-space vertical>
        <div v-for="msg in messages" :key="msg.id" :style="{ textAlign: msg.senderId === myId ? 'right' : 'left' }">
          <n-card size="small" :class="msg.senderId === myId ? 'sent' : 'received'" hoverable>
            <n-space vertical :size="2">
              <n-image v-if="msg.type==='image'" :src="msg.content" style="max-width: 300px; border-radius: 8px;" object-fit="cover" />
              <n-text v-else-if="msg.type==='file'">📄 {{ getFileName(msg.content) }}</n-text>
              <n-text v-else>{{ msg.content }}</n-text>
              <n-space justify="space-between" :size="8">
                <n-text depth="3" :style="{ fontSize: '10px' }">{{ formatTime(msg.createdAt) }}</n-text>
                <n-text v-if="msg.senderId === myId" depth="3" :style="{ fontSize: '10px' }">
                  {{ msg.isRead ? '✓✓' : '✓' }}
                </n-text>
              </n-space>
            </n-space>
          </n-card>
        </div>
      </n-space>
    </n-scrollbar>

    <n-space align="center">
      <input type="file" ref="fileInput" style="display: none" @change="handleFileSelect" />
      <n-button circle quaternary @click="triggerFileSelect">
        <template #icon>
          <n-icon><Attach /></n-icon>
        </template>
      </n-button>
      <n-input v-model:value="input" placeholder="Type a message..." :disabled="sending" @keyup.enter="sendMessage" />
      <n-button type="primary" :loading="sending" @click="sendMessage">Send</n-button>
    </n-space>
  </n-space>

  <!-- 群聊模式 -->
  <n-space v-else-if="groupId" vertical style="height: 80vh;">
    <n-space align="center" justify="space-between">
      <n-h3>Group: {{ groupName }}</n-h3>
      <n-text depth="3">Group Chat</n-text>
    </n-space>

    <n-scrollbar style="flex: 1; border: 1px solid #eee; border-radius: 8px; padding: 12px;" :native-scrollbar="false">
      <n-space vertical>
        <div v-for="msg in messages" :key="msg.id" :style="{ textAlign: msg.senderId === myId ? 'right' : 'left' }">
          <n-card size="small" :class="msg.senderId === myId ? 'sent' : 'received'" hoverable>
            <n-space vertical :size="2">
              <n-text depth="3">{{ msg.sender?.username }}</n-text>
              <n-image v-if="msg.type==='image'" :src="msg.content" style="max-width: 300px; border-radius: 8px;" object-fit="cover" />
              <n-text v-else-if="msg.type==='file'">📄 {{ getFileName(msg.content) }}</n-text>
              <n-text v-else>{{ msg.content }}</n-text>
              <n-text depth="3" :style="{ fontSize: '10px' }">{{ formatTime(msg.createdAt) }}</n-text>
            </n-space>
          </n-card>
        </div>
      </n-space>
    </n-scrollbar>

    <n-space align="center">
      <input type="file" ref="fileInput" style="display: none" @change="handleFileSelect" />
      <n-button circle quaternary @click="triggerFileSelect">
        <template #icon>
          <n-icon><Attach /></n-icon>
        </template>
      </n-button>
      <n-input v-model:value="input" placeholder="Type a message..." :disabled="sending" @keyup.enter="sendMessage" />
      <n-button type="primary" :loading="sending" @click="sendMessage">Send</n-button>
    </n-space>
  </n-space>

  <n-empty v-else description="Select a friend or group to start chatting." />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api, API_BASE } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useMessage } from 'naive-ui'

const route = useRoute()
const messageApi = useMessage()
const authStore = useAuthStore()

const friendId = computed(() => route.query.friend as string | undefined)
const groupId = computed(() => route.query.group as string | undefined)

const myId = ref<string | null>(null)

function formatTime(ts: string) {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const friendName = ref('Chat')
const groupName = ref('Group')
const messages = ref<Array<{ 
  id: string; 
  content: string; 
  senderId: string; 
  createdAt: string; 
  isRead?: boolean; 
  sender?: { username: string } 
}>>([])
const input = ref('')
const sending = ref(false)
const ws = ref<WebSocket | null>(null)

function closeWs() {
  if (ws.value) ws.value.close()
  ws.value = null
}

function triggerFileSelect() {
  fileInput.value?.click()
}

function getFileName(url: string) {
  try {
    const path = new URL(url).pathname
    return decodeURIComponent(path.split('/').pop() || 'file')
  } catch {
    return 'file'
  }
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  uploading.value = true
  try {
    const uploadRes = await api.uploadFile(file)
    // 决定消息类型：图片用 image，其他用 file
    const type = file.type.startsWith('image/') ? 'image' : 'file'
    const content = uploadRes.url
    if (isGroupMode.value && groupId.value) {
      const msg = await api.sendGroupMessage(groupId.value, content, type)
      messages.value.push(msg as any)
    } else if (friendId.value) {
      const msg = await api.sendPrivateMessage(friendId.value, content, type)
      messages.value.push(msg as any)
    }
  } catch (e: unknown) {
    messageApi.error(e instanceof Error ? e.message : 'Upload failed')
  } finally {
    uploading.value = false
    target.value = ''
  }
}

// 判断模式
const isGroupMode = computed(() => !!groupId.value)

// 加载私聊历史
async function loadPrivateHistory() {
  if (!friendId.value) return
  try {
    const res = await api.getPrivateHistory(friendId.value, 100)
    messages.value = res.messages.reverse()
    friendName.value = res.messages[0]?.sender?.username || 'Chat'
  } catch (e: unknown) {
    messageApi.error(e instanceof Error ? e.message : 'Failed to load history')
  }
}

// 加载群聊历史
async function loadGroupHistory() {
  if (!groupId.value) return
  try {
    const res = await api.getGroupMessages(groupId.value, 100)
    messages.value = res.data.reverse()
    // Get group name from first message's group info or fetch separately
    if (res.data[0]?.group) {
      groupName.value = res.data[0].group.name
    } else {
      // Fallback: could call getGroupDetail but skip for simplicity
      groupName.value = 'Group Chat'
    }
  } catch (e: unknown) {
    messageApi.error(e instanceof Error ? e.message : 'Failed to load group messages')
  }
}

// 发送消息
async function sendMessage() {
  if (!input.value.trim()) return
  sending.value = true
  try {
    if (isGroupMode.value && groupId.value) {
      const msg = await api.sendGroupMessage(groupId.value, input.value.trim())
      messages.value.push(msg as unknown as { id: string; content: string; senderId: string; createdAt: string; sender?: { username: string } })
    } else if (friendId.value) {
      const msg = await api.sendPrivateMessage(friendId.value, input.value.trim())
      messages.value.push(msg as unknown as { id: string; content: string; senderId: string; createdAt: string; sender?: { username: string } })
    }
    input.value = ''
  } catch (e: unknown) {
    messageApi.error(e instanceof Error ? e.message : 'Failed to send message')
  } finally {
    sending.value = false
  }
}

watch([friendId, groupId], () => {
  messages.value = []
  if (friendId.value) loadPrivateHistory()
  if (groupId.value) loadGroupHistory()
})

onMounted(() => {
  myId.value = authStore.userId || null;
  // 首次加载
  if (friendId.value) loadPrivateHistory()
  if (groupId.value) loadGroupHistory()

  // WebSocket connection for real-time messages
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${new URL(API_BASE).host}/api/v1/ws?token=${authStore.apiKey}`
  ws.value = new WebSocket(wsUrl)

  ws.value.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    
    // 处理已读同步事件
    if (msg.type === 'message_read') {
      const { messageIds } = msg.payload;
      messages.value.forEach(m => {
        if (messageIds.includes(m.id)) {
          m.isRead = true;
        }
      });
      return;
    }

    // 处理新消息
    if (isGroupMode.value && msg.payload?.groupId === groupId.value) {
      messages.value.push(msg.payload.message as any)
    } else if (!isGroupMode.value && msg.payload?.message && msg.payload.message.senderId !== myId.value && msg.payload.message.receiverId === myId.value) {
      messages.value.push(msg.payload.message as any)
    }
  }
})

onUnmounted(() => {
  closeWs()
})
</script>

<style scoped>
.sent {
  background-color: #18a058;
  color: white;
}

.received {
  background-color: #f0f0f0;
}
</style>
