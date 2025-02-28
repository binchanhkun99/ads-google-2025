// router/index.js
import { createRouter, createMemoryHistory } from 'vue-router';
import Appeal from '@/views/Appeal.vue';
import AutoSetCampaigns from '@/campaigns/index.vue';

const routes = [
    { path: '/', component: Appeal },
    { path: '/auto-set-campaigns', component: AutoSetCampaigns },
];

const router = createRouter({
    history: createMemoryHistory(),
    routes,
});

export default router;
