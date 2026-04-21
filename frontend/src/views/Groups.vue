<template>
  <n-space vertical size="large">
    <!-- 创建群组 -->
    <n-card title="Create Group" size="small">
      <n-space vertical>
        <n-input v-model:value="newGroup.name" placeholder="Group name" />
        <n-input v-model:value="newGroup.description" placeholder="Description (optional)" type="textarea" />
        <n-checkbox v-model:checked="newGroup.isPublic">Public</n-checkbox>
        <n-button type="primary" :loading="creating" @click="createGroup" :disabled="!newGroup.name.trim()">Create</n-button>
      </n-space>
    </n-card>

    <!-- 群组列表 -->
    <n-card :title="listTitle" size="small">
      <n-space vertical>
        <n-select v-model:value="listType" :options="typeOptions" @update:value="loadGroups" style="width: 200px;" />
        <n-list hoverable clickable bordered>
          <n-list-item v-for="g in groups" :key="g.id" @click="selectGroup(g)">
            <n-space align="center" justify="space-between">
              <n-space align="center">
                <n-avatar round size="medium" :style="{ backgroundColor: '#ddd' }">{{ g.name[0].toUpperCase() }}</n-avatar>
                <div>
                  <n-text strong>{{ g.name }}</n-text>
                  <n-text depth="3" class="ml-2">{{ g.memberCount }} members</n-text>
                  <n-text depth="3" class="ml-2">{{ g.isPublic ? '🌐 Public' : '🔒 Private' }}</n-text>
                </div>
              </n-space>
              <n-button size="small" type="primary" @click.stop="openChat(g.id)">Open</n-button>
            </n-space>
          </n-list-item>
        </n-list>
        <n-empty v-if="groups.length === 0" description="No groups found. Create one or switch to Public to explore." />
      </n-space>
    </n-card>

    <!-- 群组详情/消息 (当选中时) -->
    <n-card v-if="selectedGroup" :title="`Chat: ${selectedGroup.name}`" size="small">
      <n-space vertical>
        <n-scrollbar style="max-height: 400px; border: 1px solid #eee; border-radius: 8px; padding: 12px;">
          <n-space vertical>
            <div v-for="msg in messages" :key="msg.id">
              <n-space :align="'center'" :style="{ justifyContent: msg.senderId === myId ? 'flex-end' : 'flex-start' }">
                <n-card size="tiny" :class="msg.senderId === myId ? 'sent' : 'received'">
                  <n-space vertical :size="2">
                    <n-text depth="3">{{ msg.sender?.username }}</n-text>
                    <n-text>{{ msg.content }}</n-text>
                    <n-text depth="3" :style="{ fontSize: '10px' }">{{ formatTime(msg.createdAt) }}</n-text>
                  </n-space>
                </n-card>
              </n-space>
            </div>
          </n-space>
        </n-scrollbar>

        <n-space align="center">
          <n-input v-model:value="groupInput" placeholder="Send to group..." @keyup.enter="sendGroupMessage" />
          <n-button type="primary" :loading="sending" @click="sendGroupMessage">Send</n-button>
        </n-space>
      </n-space>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api/client'
import { useMessage } from 'naive-ui'

const router = useRouter()
const authStore = useAuthStore()
const messageApi = useMessage()

const newGroup = ref({ name: '', description: '', isPublic: false })
const creating = ref(false)
const groups = ref<any[]>([])
const listType = ref<'joined' | 'public'>('joined')
const typeOptions = [
  { label: 'My Groups', value: 'joined' as const },
  { label: 'Public Groups', value: 'public' as const },
]
const selectedGroup = ref<any>(null)
const messages = ref<any[]>([])
const groupInput = ref('')
const sending = ref(false)
const myId = ref('') // will be set when user data available

const listTitle = computed(() => listType.value === 'joined' ? 'My Groups' : 'Public Groups')

async function loadGroups() {
  try {
    const res = await api.getGroups(listType.value)
    groups.value = res
  } catch (e: any) {
    messageApi.error(e.message)
  }
}

async function createGroup() {
  if (!newGroup.value.name.trim()) return
  creating.value = true
  try {
    await api.createGroup(newGroup.value.name.trim(), newGroup.value.description, newGroup.value.isPublic)
    messageApi.success('Group created')
    newGroup.value = { name: '', description: '', isPublic: false }
    loadGroups()
  } catch (e: any) {
    messageApi.error(e.message)
  } finally {
    creating.value = false
  }
}

async function selectGroup(g: any) {
  selectedGroup.value = g
  await loadGroupMessages(g.id)
}

async function loadGroupMessages(groupId: string) {
  try {
    const res = await api.getGroupMessages(groupId, 50)
    messages.value = res.data.reverse()
  } catch (e: any) {
    messageApi.error(e.message)
  }
}

async function sendGroupMessage() {
  if (!groupInput.value.trim() || !selectedGroup.value) return
  sending.value = true
  try {
    const msg = await api.sendGroupMessage(selectedGroup.value.id, groupInput.value.trim())
    messages.value.push(msg)
    groupInput.value = ''
  } catch (e: any) {
    messageApi.error(e.message)
  } finally {
    sending.value = false
  }
}

function openChat(groupId: string) {
  // Navigate to chat with group context (could use separate group chat page)
  router.push({ path: '/chat', query: { group: groupId } })
}

onMounted(() => {
  loadGroups()
  // myId could be set from authStore if we store full user object
})
</script>

<style scoped>
.ml-2 { margin-left: 8px; }
.sent { background-color: #e6f7ff; text-align: right; }
.received { background-color: #f5f5f5; }
</style>