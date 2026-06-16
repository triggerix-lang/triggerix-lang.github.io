import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  plugins: [vue(), UnoCSS()],
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
