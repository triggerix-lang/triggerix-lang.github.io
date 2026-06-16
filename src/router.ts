import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./pages/Home.vue')
    },
    {
      path: '/demo/button-click',
      component: () => import('./pages/demos/ButtonClick.vue')
    },
    {
      path: '/demo/input-focus',
      component: () => import('./pages/demos/InputFocus.vue')
    },
    {
      path: '/demo/button-modify-input',
      component: () => import('./pages/demos/ButtonModifyInput.vue')
    },
    {
      path: '/demo/carousel-switch',
      component: () => import('./pages/demos/CarouselSwitch.vue')
    },
    {
      path: '/demo/carousel-linkage',
      component: () => import('./pages/demos/CarouselLinkage.vue')
    }
  ]
})
