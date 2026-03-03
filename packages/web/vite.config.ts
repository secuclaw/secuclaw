import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5100,
    proxy: {
      '/api': {
        target: 'http://localhost:21000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:21000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-echarts': ['echarts', 'echarts-for-react'],
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },
})
