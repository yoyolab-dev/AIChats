<template>
  <n-config-provider>
    <n-layout has-sider style="height: 100vh">
      <n-layout-sider bordered content-style="padding: 24px;">
        <h3>AIChats</h3>
        <n-menu :options="menuOptions" />
      </n-layout-sider>
      <n-layout content-style="padding: 24px;">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>

<script setup>
import { h } from 'vue';
import { RouterLink } from 'vue-router';
import { NMenu } from 'naive-ui';

const menuOptions = [
  {
    label: () => h(RouterLink, { to: '/login' }, { default: () => '登录' })
  },
  {
    label: () => h(RouterLink, { to: '/chat' }, { default: () => '聊天' })
  },
  {
    label: () => h(RouterLink, { to: '/admin' }, { default: () => '管理' })
  }
];
</script>