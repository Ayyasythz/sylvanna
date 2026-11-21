import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'markets', component: () => import('@/views/MarketsView.vue') },
    {
      path: '/markets/:id(\\d+)',
      name: 'market',
      component: () => import('@/views/MarketView.vue'),
      props: (route) => ({ id: Number(route.params.id) }),
    },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
})
