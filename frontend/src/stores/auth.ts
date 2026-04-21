import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const apiKey = ref(localStorage.getItem('apiKey') || '');
  const username = ref('');
  const role = ref<'USER' | 'ADMIN'>('USER');

  function setAuth(key: string, user: { username: string; role: 'USER' | 'ADMIN' }) {
    apiKey.value = key;
    username.value = user.username;
    role.value = user.role;
    localStorage.setItem('apiKey', key);
  }

  function logout() {
    apiKey.value = '';
    username.value = '';
    role.value = 'USER';
    localStorage.removeItem('apiKey');
  }

  return { apiKey, username, role, setAuth, logout };
});