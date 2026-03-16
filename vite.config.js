import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // For API requests
      '/api': {
        target: 'https://api.gobt.in',
        changeOrigin: true,
      },
      // For image requests - proxy the uploads path
      '/uploads': {
        target: 'https://api.gobt.in',
        changeOrigin: true,
      }
    }
  }
})