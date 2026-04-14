import axios from 'axios';
import { useAuthStore } from '@/stores/auth.js';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const instance = axios.create({
  baseURL,
  timeout: 10000
});

// Request interceptor: add Authorization header
instance.interceptors.request.use(
  config => {
    const authStore = useAuthStore();
    if (authStore.apiKey) {
      config.headers.Authorization = `Bearer ${authStore.apiKey}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor: handle 401
instance.interceptors.response.use(
  res => res,
  async error => {
    const { response } = error;
    if (response?.status === 401) {
      const authStore = useAuthStore();
      authStore.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;