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
import { api } from '@/api/client';

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
    const data = await api.register(form.value.username);
    authStore.setAuth(data.apiKey, data.id, { username: data.username, role: data.role });
    message.success('Welcome!');
    router.push('/chat');
  } catch (e: any) {
    message.error(e?.message || 'Network error');
  }
}
</script>