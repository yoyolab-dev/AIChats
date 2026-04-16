<template>
  <n-config-provider>
    <n-message-provider>
      <!-- Login page: centered full screen -->
      <div v-if="isLoginPage" style="height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px;">
        <router-view />
      </div>

      <!-- Main app layout -->
      <template v-else>
        <!-- Desktop layout -->
        <n-layout v-if="!isMobile" has-sider style="height: 100vh">
          <n-layout-sider bordered content-style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3>AIChats</h3>
              <n-button v-if="isLoggedIn" size="small" @click="authStore.logout()">退出</n-button>
            </div>
            <n-menu :options="menuOptions" />
          </n-layout-sider>
          <n-layout-content content-style="padding: 24px;">
            <router-view />
          </n-layout-content>
        </n-layout>

        <!-- Mobile layout -->
        <n-layout v-else style="height: 100vh">
          <n-layout-header bordered style="padding: 12px; display: flex; align-items: center; justify-content: space-between;">
            <n-button strong tertiary circle @click="drawerOpen = true" style="font-size: 20px; width: 40px; height: 40px;">
              ☰
            </n-button>
            <span style="margin-left: 12px; font-weight: bold; font-size: 18px;">AIChats</span>
            <n-button v-if="isLoggedIn" size="small" @click="authStore.logout()">退出</n-button>
          </n-layout-header>
          <n-layout-content content-style="padding: 12px;">
            <router-view />
          </n-layout-content>
        </n-layout>

        <!-- Mobile drawer -->
        <n-drawer v-model:show="drawerOpen" placement="left" :width="240" content-style="padding: 24px;">
          <h3>AIChats</h3>
          <n-menu :options="menuOptions" />
        </n-drawer>
      </template>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { h, ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  NConfigProvider,
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NMenu,
  NButton,
  NDrawer,
  NLayoutHeader,
  NMessageProvider
} from 'naive-ui'
import { useAuthStore } from '@/stores/auth.js'

const route = useRoute()
const authStore = useAuthStore()

const isMobile = ref(false)
const drawerOpen = ref(false)

const isLoginPage = computed(() => route.path === '/login')
const isLoggedIn = computed(() => !!authStore.user)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

watch(route, () => {
  drawerOpen.value = false
})

const menuOptions = computed(() => {
  const base = [
    { key: 'chat', label: () => h(RouterLink, { to: '/chat' }, { default: () => '聊天' }) },
    { key: 'friends', label: () => h(RouterLink, { to: '/friends' }, { default: () => '好友' }) }
  ]
  if (authStore.user?.isAdmin) {
    base.push({ key: 'admin', label: () => h(RouterLink, { to: '/admin' }, { default: () => '管理' }) })
  }
  if (!isLoggedIn.value) {
    base.unshift({ key: 'login', label: () => h(RouterLink, { to: '/login' }, { default: () => '登录' }) })
  }
  return base
})
</script>