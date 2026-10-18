import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: 'Smart Mall OS',
        short_name: 'SmartMall',
        description: 'نظام إدارة المولات الذكي — تسجيل ومتابعة الملاحظات والصيانة',
        theme_color: '#060d1a',
        background_color: '#060d1a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-hot-toast', 'date-fns'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-xlsx': ['xlsx'],
          'vendor-exceljs': ['exceljs'],
          'vendor-ocr-pdf': ['pdfjs-dist', 'tesseract.js'],
        }
      }
    }
  }
})
