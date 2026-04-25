import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

// 懒加载路由组件 — 代码分割，减小首屏体积
const Login = () => import('./views/Login.vue');
const Chat = () => import('./views/Chat.vue');
const Friends = () => import('./views/Friends.vue');
const Groups = () => import('./views/Groups.vue');
const Admin = () => import('./views/Admin.vue');

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