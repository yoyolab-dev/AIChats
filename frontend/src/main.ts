import { createApp } from 'vue';
import { createPinia } from 'pinia';
import naive from 'naive-ui';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(naive);

const authStore = useAuthStore();
// 如果未登录，跳转到登录页 (路由守卫在 router.beforeEach 可加，这里简化)
if (!authStore.apiKey) {
  router.push('/login');
}

app.mount('#app');