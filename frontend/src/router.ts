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
  {
    path: '/',
    component: () => import('./components/AppLayout.vue'),
    children: [
      { path: 'chat', name: 'Chat', component: Chat },
      { path: 'friends', name: 'Friends', component: Friends },
      { path: 'groups', name: 'Groups', component: Groups },
      { path: 'admin', name: 'Admin', component: Admin },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局路由守卫 — 未登录用户只能访问 /login
router.beforeEach((to, _from, next) => {
  const apiKey = localStorage.getItem('apiKey');
  if (!apiKey && to.name !== 'Login') {
    next({ name: 'Login' });
  } else if (apiKey && to.name === 'Login') {
    next({ name: 'Chat' }); // 已登录访问登录页，跳转聊天
  } else {
    next();
  }
});

export default router;
