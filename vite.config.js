import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // For API requests
      '/api': {
        target: 'http://13.232.73.121',
        changeOrigin: true,
      },
      // For image requests - proxy the uploads path
      '/uploads': {
        target: 'http://13.232.73.121',
        changeOrigin: true,
      }
    }
  }
})