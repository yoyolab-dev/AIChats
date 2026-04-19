import axios from 'axios';

const apiBase = (import.meta.env.VITE_API_BASE_URL || 'https://api.oujun.work').replace(/\/$/, '') + '/api/v1';

const http = axios.create({
  baseURL: apiBase,
  timeout: 10000
});

// 从 localStorage 恢复 token
const token = localStorage.getItem('apiKey');
if (token) {
  http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// 令牌更新器（用于登录后）
export function setToken(key) {
  http.defaults.headers.common['Authorization'] = `Bearer ${key}`;
  localStorage.setItem('apiKey', key);
}

export function clearToken() {
  delete http.defaults.headers.common['Authorization'];
  localStorage.removeItem('apiKey');
}

export default http;
