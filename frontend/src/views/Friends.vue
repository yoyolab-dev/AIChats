<template>
  <n-space vertical size="large">
    <!-- 搜索与添加好友 -->
    <n-card title="Find Users" size="small">
      <n-space>
        <n-input v-model:value="query" placeholder="Enter username" @keyup.enter="search" clearable />
        <n-button type="primary" :loading="searching" @click="search">Search</n-button>
      </n-space>
      <n-list v-if="results.length" bordered class="mt-2">
        <n-list-item v-for="u in results" :key="u.id">
          <n-space align="center" justify="space-between">
            <n-text depth="3">{{ u.username }}</n-text>
            <n-button size="small" type="primary" :disabled="isSelf(u.id)" @click="sendRequest(u.id)">Add Friend</n-button>
          </n-space>
        </n-list-item>
      </n-list>
    </n-card>

    <!-- 好友列表 -->
    <n-card title="My Friends" size="small">
      <n-list v-if="friends.length" bordered>
        <n-list-item v-for="f in friends" :key="f.id">
          <n-space align="center">
            <n-avatar round size="small" :style="{ backgroundColor: '#ddd' }">{{ f.username[0].toUpperCase() }}</n-avatar>
            <div>
              <n-text strong>{{ f.username }}</n-text>
              <n-text depth="3" class="ml-2">{{ f.friendship.status }}</n-text>
            </div>
            <n-button size="tiny" text type="primary" @click="openChat(f.id)">Chat</n-button>
          </n-space>
        </n-list-item>
      </n-list>
      <n-empty v-else description="No friends yet. Search and add some!" />
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api/client'
import { useMessage } from 'naive-ui'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

const query = ref('')
const searching = ref(false)
const results = ref<any[]>([])
const friends = ref<any[]>([])

function isSelf(uid: string) {
  return false // TODO: compare with authStore.id when available
}

async function search() {
  if (!query.value.trim()) return
  searching.value = true
  try {
    const res = await api.searchUsers(query.value)
    results.value = res.users.filter((u: any) => !isSelf(u.id))
  } catch (e: any) {
    message.error(e.message)
  } finally {
    searching.value = false
  }
}

async function sendRequest(userId: string) {
  try {
    await api.sendFriendRequest(userId)
    message.success('Friend request sent')
    query.value = ''
    results.value = []
    await loadFriends()
  } catch (e: any) {
    message.error(e.message)
  }
}

async function loadFriends() {
  try {
    const res = await api.getFriends()
    friends.value = res.friends
  } catch (e: any) {
    message.error(e.message || 'Failed to load friends')
  }
}

function openChat(friendId: string) {
  // Navigate to chat page, pass selected friendId (could also use store)
  router.push({ path: '/chat', query: { friend: friendId } })
}

onMounted(() => {
  loadFriends()
})
</script>

<style scoped>
.mt-2 { margin-top: 8px; }
.ml-2 { margin-left: 8px; }
</style>