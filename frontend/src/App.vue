<template>
  <n-config-provider>
    <n-layout style="min-height: 100vh;">
      <n-layout-header bordered style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0;">💬 AIChats</h2>
          <div v-if="user">
            <n-space align="center">
              <n-text>{{ user.nickname || user.username }}</n-text>
              <n-tag :type="user.role === 'ADMIN' ? 'error' : 'default'">{{ user.role }}</n-tag>
              <n-button size="small" @click="logout">退出</n-button>
              <n-button v-if="user.role === 'ADMIN'" type="primary" size="small" @click="$router.push('/admin')">管理后台</n-button>
            </n-space>
          </div>
        </div>
      </n-layout-header>
      <n-layout-content content-style="padding: 24px;">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>

<script setup>
import { inject, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NConfigProvider, NLayout, NLayoutHeader, NLayoutContent, NSpace, NText, NTag, NButton } from 'naive-ui';

const user = inject('user');
const logout = inject('logout');
const router = useRouter();

onMounted(() => {
  // 如果已登录且在登录页面，跳转到 chat
  if (user.value && router.currentRoute.value.path === '/login') {
    router.push('/chat');
  }
});
</script>
