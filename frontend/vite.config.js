import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// URL del backend desde variable de entorno, por defecto localhost (IPv4)
const API_URL = process.env.VITE_API_URL || 'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT) || 5173,
    host: '0.0.0.0', // Permitir acceso desde fuera del contenedor
    proxy: {
      '/api/sse': {
        target: API_URL,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache'
            proxyRes.headers['x-accel-buffering'] = 'no'
          })
        }
      },
      '/api': {
        target: API_URL,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
        }
      }
    }
  }
})