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
            <n-text>{{ msg.content }}</n-text>
            <template #footer>
              <n-text depth="3" :style="{ fontSize: '10px' }">{{ formatTime(msg.createdAt) }}</n-text>
            </template>
          </n-card>
        </div>
      </n-space>
    </n-scrollbar>

    <n-space align="center">
      <n-input v-model:value="input" placeholder="Type a message..." @keyup.enter="sendMessage" :disabled="sending" />
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
              <n-text>{{ msg.content }}</n-text>
              <n-text depth="3" :style="{ fontSize: '10px' }">{{ formatTime(msg.createdAt) }}</n-text>
            </n-space>
          </n-card>
        </div>
      </n-space>
    </n-scrollbar>

    <n-space align="center">
      <n-input v-model:value="input" placeholder="Type a message..." @keyup.enter="sendMessage" :disabled="sending" />
      <n-button type="primary" :loading="sending" @click="sendMessage">Send</n-button>
    </n-space>
  </n-space>

  <n-empty v-else description="Select a friend or group to start chatting." />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import { useMessage } from 'naive-ui'

const route = useRoute()
const messageApi = useMessage()

const friendId = computed(() => route.query.friend as string | undefined)
const groupId = computed(() => route.query.group as string | undefined)
const myId = ref<string | null>(null)

function formatTime(ts: string) {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const friendName = ref('Chat')
const groupName = ref('Group')
const messages = ref<any[]>([])
const input = ref('')
const sending = ref(false)
const ws = ref<WebSocket | null>(null)

function closeWs() {
  if (ws.value) ws.value.close()
  ws.value = null
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
  } catch (e: any) {
    messageApi.error(e.message)
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
  } catch (e: any) {
    messageApi.error(e.message)
  }
}

// 发送消息
async function sendMessage() {
  if (!input.value.trim()) return
  sending.value = true
  try {
    if (isGroupMode.value && groupId.value) {
      const msg = await api.sendGroupMessage(groupId.value, input.value.trim())
      messages.value.push(msg)
    } else if (friendId.value) {
      const msg = await api.sendPrivateMessage(friendId.value, input.value.trim())
      messages.value.push(msg)
    }
    input.value = ''
  } catch (e: any) {
    messageApi.error(e.message)
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
  // 首次加载
  if (friendId.value) loadPrivateHistory()
  if (groupId.value) loadGroupHistory()
})

onUnmounted(() => {
  closeWs()
})
</script>

<style scoped>
.sent { background-color: #e6f7ff; text-align: right; }
.received { background-color: #f5f5f5; }
.ml-2 { margin-left: 8px; }
</style>