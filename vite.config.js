import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/baseball-score/',
  plugins: [vue()],
  build: {
    outDir: 'docs'
  }
})