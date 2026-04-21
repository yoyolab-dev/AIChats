<template>
  <n-space vertical align="center" style="min-height: 60vh; justify-content: center;">
    <n-card title="AIChats Login" style="width: 400px;">
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="auto">
        <n-form-item label="Username" path="username">
          <n-input v-model:value="form.username" placeholder="Enter username" />
        </n-form-item>
        <n-form-item :wrapper-col="{ span: 24 }">
          <n-button type="primary" block @click="handleSubmit">Enter</n-button>
        </n-form-item>
      </n-form>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();

const form = ref({ username: '' });

const rules = {
  username: [{ required: true, message: 'Username required', trigger: 'blur' }],
};

async function handleSubmit() {
  if (!form.value.username) return;
  try {
    const res = await fetch('http://localhost:8200/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.value.username }),
    });
    const data = await res.json();
    if (data.success) {
      authStore.setAuth(data.data.apiKey, { username: data.data.username, role: data.data.role });
      message.success('Welcome!');
      router.push('/chat');
    } else {
      message.error(data.error?.message || 'Failed to register');
    }
  } catch (e) {
    message.error('Network error');
  }
}
</script>