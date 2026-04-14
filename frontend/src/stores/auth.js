import { defineStore } from 'pinia';
import axios from '@/utils/axios.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    apiKey: '',
    user: null
  }),
  actions: {
    async login(key) {
      // 验证 API Key 并获取用户信息
      const res = await axios.get('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${key}` }
      });
      if (res.data.success) {
        this.apiKey = key;
        this.user = res.data.data;
        localStorage.setItem('apiKey', key);
      } else {
        throw new Error(res.data.message || 'Invalid API Key');
      }
    },
    logout() {
      this.apiKey = '';
      this.user = null;
      localStorage.removeItem('apiKey');
    },
    initFromStorage() {
      const key = localStorage.getItem('apiKey');
      if (key) {
        this.apiKey = key;
        // TODO: fetch user info in background
      }
    }
  }
});