import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175, // Avoid conflict with main app (5173) and player (5174)
    proxy: {
      '/api': {
        target: 'http://localhost:8001', // Backend API
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api prefix if backend doesn't expect it. Wait, backend uses /words, /media directly?
        // Let's check backend/api/main.py. It includes routers without prefix, but routers have prefixes like /words.
        // So /api/words -> http://localhost:8001/words
      },
      '/uploads': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      }
    }
  }
})
