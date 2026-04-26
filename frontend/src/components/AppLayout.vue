<template>
  <n-layout has-sider style="height: 100vh">
    <n-layout-header bordered style="padding: 12px 24px; display: flex; align-items: center; gap: 12px;">
      <n-text strong style="font-size: 18px;">AIChats</n-text>
      <n-space>
        <n-button text @click="$router.push('/chat')">Chat</n-button>
        <n-button text @click="$router.push('/friends')">Friends</n-button>
        <n-button text @click="$router.push('/groups')">Groups</n-button>
        <n-button v-if="authStore.role === 'ADMIN'" text @click="$router.push('/admin')">Admin</n-button>
        <n-button size="small" @click="handleLogout">Logout</n-button>
      </n-space>
    </n-layout-header>
    <n-layout-content content-style="padding: 24px;">
      <slot />
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>
