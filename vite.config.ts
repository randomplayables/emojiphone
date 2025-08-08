// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vitejs.dev/config/
// export default defineConfig(({ command }) => {
//   const config = {
//     plugins: [react()],
//     server: {
//       // Add this to make Vite's development server use your private IP
//       host: '0.0.0.0',
//       // Add this line to allow requests from your localtunnel domain
//       allowedHosts: ['.loca.lt'],
//       proxy: {
//         // Configure a proxy for API requests
//         '/api': {
//           target: 'http://172.31.12.157:3000',
//           changeOrigin: true,
//           rewrite: (path: string) => path.replace(/^\/api/, '')
//         }
//       }
//     },
//   };

//   if (command === 'build') {
//     (config as any).build = {
//       esbuild: {
//         drop: ['console', 'debugger'],
//       },
//     };
//   }

//   return config;
// })



import { defineConfig, ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';

  // Define the base server configuration object
  const serverConfig: {
    host: string;
    allowedHosts: string[];
    proxy?: Record<string, string | ProxyOptions>;
  } = {
    host: '0.0.0.0',
    allowedHosts: ['.loca.lt'],
  };

  // Only add the proxy object if we are NOT in production
  if (!isProduction) {
    serverConfig.proxy = {
      '/api': {
        target: 'http://172.31.12.157:3000',
        changeOrigin: true,
        // The incorrect "rewrite" line has been completely removed.
      },
    };
  }

  const config = {
    plugins: [react()],
    server: serverConfig,
  };

  if (command === 'build') {
    (config as any).build = {
      esbuild: {
        drop: ['console', 'debugger'],
      },
    };
  }
  
  return config;
});
