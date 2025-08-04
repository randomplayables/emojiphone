import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    server: {
      // Add this to make Vite's development server use your private IP
      host: '0.0.0.0',
      // Add this line to allow requests from your localtunnel domain
      allowedHosts: ['.loca.lt'],
      proxy: {
        // Configure a proxy for API requests
        '/api': {
          target: 'http://172.31.12.157:3000',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, '')
        }
      }
    },
  };

  if (command === 'build') {
    (config as any).build = {
      esbuild: {
        drop: ['console', 'debugger'],
      },
    };
  }

  return config;
})