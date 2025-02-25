import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    {
        path: '/',
        component: () => import('~/views/Appeal.vue'), // Hiển thị Home.vue khi vào /
    },
    {
        path: '/auto-set-campaigns',
        component: () => import('~/campaigns/index.vue'),
    }
]

const router = createRouter({
    routes,
    history: createWebHistory(),
});

export default router;
