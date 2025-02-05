import {createApp} from 'vue'
import './style.css'
import Notifications from '@kyvg/vue3-notification'
import Vue3Mask from 'vue-3-mask';
import App from './App.vue'
import './index.css'


createApp(App)
    .use(Vue3Mask)
    .use(Notifications)
    .mount('#app')
