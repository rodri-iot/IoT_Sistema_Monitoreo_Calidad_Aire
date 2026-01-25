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
      '/api': {
        target: API_URL,
        changeOrigin: true,
        secure: false,
        // Forzar uso de IPv4
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
})