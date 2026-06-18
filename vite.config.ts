import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite-plus'
import VueRouter from 'vue-router/vite'

export default defineConfig({
  plugins: [
    VueRouter({
      dts: '.auto-generated/typed-router.d.ts'
    }),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'monaco-editor'
        }
      }
    }),
    UnoCSS()
  ],
  staged: {
    '*': 'vp check --fix'
  },
  fmt: {
    singleQuote: true,
    semi: false,
    trailingComma: 'none'
  },
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
    options: { typeAware: true, typeCheck: true }
  }
})
