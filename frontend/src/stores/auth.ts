import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const apiKey = ref(localStorage.getItem('apiKey') || '');
  const userId = ref(localStorage.getItem('userId') || '');
  const username = ref('');
  const role = ref<'USER' | 'ADMIN'>('USER');

  function setAuth(key: string, id: string, user: { username: string; role: 'USER' | 'ADMIN' }) {
    apiKey.value = key;
    userId.value = id;
    username.value = user.username;
    role.value = user.role;
    localStorage.setItem('apiKey', key);
    localStorage.setItem('userId', id);
  }

  function setUserInfo(user: { id: string; username: string; role: 'USER' | 'ADMIN' }) {
    userId.value = user.id;
    username.value = user.username;
    role.value = user.role;
    localStorage.setItem('userId', user.id);
  }

  function logout() {
    apiKey.value = '';
    userId.value = '';
    username.value = '';
    role.value = 'USER';
    localStorage.removeItem('apiKey');
    localStorage.removeItem('userId');
  }

  return { apiKey, userId, username, role, setAuth, setUserInfo, logout };
});