import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_URL ?? '/',
  build: {
    // Target Safari 13 (iOS 13+) to compile away ??, ?., and other
    // ES2020 syntax that older devices don't support natively.
    target: 'safari13',
  },
})
