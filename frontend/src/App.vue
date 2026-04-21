<template>
  <n-config-provider>
    <n-layout has-sider style="height: 100vh">
      <n-layout-header bordered style="padding: 12px 24px; display: flex; align-items: center; gap: 12px;">
        <n-text strong style="font-size: 18px;">AIChats</n-text>
        <n-space v-if="authStore.apiKey">
          <n-button text @click="$router.push('/chat')">Chat</n-button>
          <n-button text @click="$router.push('/friends')">Friends</n-button>
          <n-button text @click="$router.push('/groups')">Groups</n-button>
          <n-button v-if="authStore.role === 'ADMIN'" text @click="$router.push('/admin')">Admin</n-button>
          <n-button size="small" @click="authStore.logout()">Logout</n-button>
        </n-space>
      </n-layout-header>
      <n-layout-content content-style="padding: 24px;">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>

<script setup lang="ts">
import { useAuthStore } from './stores/auth';
const authStore = useAuthStore();
</script>