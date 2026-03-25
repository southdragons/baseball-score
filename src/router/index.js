import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHashHistory(), // ←ここが重要
  routes: [
    {
      path: '/',
      component: HomeView,
    },
  ],
})

export default router