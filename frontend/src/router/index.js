import { createRouter, createWebHistory } from 'vue-router';
import Login from '@/pages/Login.vue';
import Chat from '@/pages/Chat.vue';
import Admin from '@/pages/Admin.vue';

const routes = [
  { path: '/login', name: 'Login', component: Login },
  { path: '/chat', name: 'Chat', component: Chat },
  { path: '/admin', name: 'Admin', component: Admin },
  { path: '/', redirect: '/login' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;