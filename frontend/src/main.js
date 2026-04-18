import { createApp, ref, provide } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import http from './services/api.js';
// Export for direct imports (e.g., Login.vue)
export { http };
import App from './App.vue';

// 全局状态
const apiKey = ref(localStorage.getItem('apiKey') || null);
const user = ref(null);

async function initAuth() {
  if (apiKey.value) {
    try {
      const resp = await http.get('/users/me');
      user.value = resp.data.user;
    } catch (e) {
      // token 失效
      apiKey.value = null;
      localStorage.removeItem('apiKey');
      delete http.defaults.headers.common['Authorization'];
    }
  }
}

function setAuth(key, userData) {
  apiKey.value = key;
  user.value = userData;
  localStorage.setItem('apiKey', key);
  localStorage.setItem('user', JSON.stringify(userData));
  http.defaults.headers.common['Authorization'] = `Bearer ${key}`;
}

function logout() {
  apiKey.value = null;
  user.value = null;
  localStorage.removeItem('apiKey');
  localStorage.removeItem('user');
  delete http.defaults.headers.common['Authorization'];
}

// 路由守卫
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/Login.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('./views/Chat.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('./views/Admin.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    }
  ]
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !apiKey.value) {
    next({ path: '/login' });
    return;
  }
  if (to.meta.requiresAdmin && user.value?.role !== 'ADMIN') {
    next({ path: '/chat' });
    return;
  }
  next();
});

// 初始化
initAuth().then(() => {
  const app = createApp(App);
  app.use(router);
  app.provide('http', http);
  app.provide('apiKey', apiKey);
  app.provide('user', user);
  app.provide('logout', logout);
  app.mount('#app');
});
