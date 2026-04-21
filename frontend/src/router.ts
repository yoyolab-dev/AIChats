import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Login from './views/Login.vue';
import Chat from './views/Chat.vue';
import Friends from './views/Friends.vue';
import Groups from './views/Groups.vue';
import Admin from './views/Admin.vue';

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login },
  { path: '/chat', name: 'Chat', component: Chat },
  { path: '/friends', name: 'Friends', component: Friends },
  { path: '/groups', name: 'Groups', component: Groups },
  { path: '/admin', name: 'Admin', component: Admin },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;