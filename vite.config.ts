import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite-plus'
import VueRouter from 'vue-router/vite'
import { netlifyDevProxy } from './scripts/vite/plugins/netlifyDevProxy'

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
    UnoCSS(),
    netlifyDevProxy()
  ],
  staged: {
    '*': 'vp check --fix'
  },
  fmt: {
    singleQuote: true,
    semi: false,
    trailingComma: 'none',
    // .claude/ 装 Claude Code 本地权限配置（settings.local.json），不参与项目 lint/fmt
    ignorePatterns: ['.claude/**']
  },
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ['.claude/**', 'dist/**']
  }
})
