/// <reference types="vite-plus/client" />
/// <reference types="vue-router/auto-routes" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, any>
  export default component
}
