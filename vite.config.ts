import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // مسیر نسبی: خروجی بیلد روی GitHub Pages (زیرمسیر /Apps/) و هر هاست دیگری بدون تنظیم اضافه کار می‌کند
  base: './',
  build: {
    // جداسازی وابستگی‌های سنگین برای کش بهتر مرورگر و باندل کوچک‌تر
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
