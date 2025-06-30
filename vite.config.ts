import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Add this to make Vite's development server use your private IP
    host: '0.0.0.0',
    proxy: {
      // Configure a proxy for API requests
      '/api': {
        target: 'http://172.31.12.157:3000',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
})