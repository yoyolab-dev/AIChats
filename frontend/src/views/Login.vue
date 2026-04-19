<template>
  <div class="login-container">
    <n-card title="登录 AIChats" style="max-width: 400px; margin: 100px auto;">
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="auto">
        <n-form-item label="API Key" path="apiKey">
          <n-input v-model:value="form.apiKey" placeholder="请输入你的 API Key" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" @click="handleLogin" :loading="loading" block>登录</n-button>
        </n-form-item>
        <n-text depth="3">如何获取 API Key？注册后首次会显示，以后可在设置中查看。</n-text>
      </n-form>
    </n-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useMessage, NForm, NFormItem, NInput, NButton, NCard, NText } from 'naive-ui';
import { useRouter } from 'vue-router';
import { http } from '../main.js'; // will adjust

const message = useMessage();
const router = useRouter();

const formRef = ref(null);
const loading = ref(false);
const form = reactive({ apiKey: '' });

const rules = {
  apiKey: [{ required: true, message: '请输入 API Key', trigger: 'blur' }]
};

async function handleLogin() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  loading.value = true;
  try {
    // 先设置 Authorization header
    http.defaults.headers.common['Authorization'] = `Bearer ${form.apiKey}`;
    // 使用提供的 API Key 获取当前用户信息
    const response = await http.get('/users/me');
    const userData = response.data.user;
    // 将 apiKey 和 user 保存到本地
    localStorage.setItem('apiKey', form.apiKey);
    localStorage.setItem('user', JSON.stringify(userData));
    message.success('登录成功');
    router.push('/chat');
  } catch (error) {
    console.error(error);
    message.error('登录失败：无效的 API Key');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  background: #f5f5f5;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
