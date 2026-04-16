<template>
  <n-space vertical align="center" justify="center" style="height: 100vh">
    <n-card title="登录" :style="cardStyle">
      <n-form ref="formRef" :model="form" :rules="rules">
        <n-form-item path="apiKey" label="API Key">
          <n-input v-model:value="form.apiKey" placeholder="sk-..." />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" @click="handleLogin" :loading="loading" block size="large">登录</n-button>
        </n-form-item>
      </n-form>
    </n-card>
  </n-space>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '@/stores/auth.js';

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();

const formRef = ref(null);
const form = ref({ apiKey: '' });
const loading = ref(false);

const rules = {
  apiKey: { required: true, message: 'API Key 不能为空', trigger: 'blur' }
};

// 响应式卡片宽度：移动端90%，桌面端400px
const cardStyle = {
  width: '90%',
  maxWidth: '400px'
};

async function handleLogin() {
  try {
    await formRef.value?.validate();
    loading.value = true;
    await authStore.login(form.value.apiKey);
    message.success('登录成功');
    router.push('/chat');
  } catch (e) {
    message.error(e.message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>