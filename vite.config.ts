import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // مسیر نسبی: خروجی بیلد روی GitHub Pages (زیرمسیر /Apps/) و هر هاست دیگری بدون تنظیم اضافه کار می‌کند
  base: './',
  // سرور توسعه/پیش‌نمایش: دسترسی از شبکه محلی و تونل‌ها (ngrok، محیط‌های ابری) بدون بلاک شدن
  server: { host: true, allowedHosts: true },
  preview: { host: true, allowedHosts: true },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    // سقف هشدار باندل: چانک‌ها به‌صورت دستی و کوچک تقسیم شده‌اند
    chunkSizeWarningLimit: 900,
    // جداسازی وابستگی‌های سنگین برای کش بهتر مرورگر و باندل کوچک‌تر
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion';
          if (id.includes('react-router')) return 'router';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
          if (id.includes('lucide-react')) return 'icons';
          return 'vendor';
        },
      },
    },
  },
  esbuild: {
    // در بیلد نهایی فقط دستور debugger حذف می‌شود (پیام‌های خطا برای کاربر می‌مانند)
    drop: ['debugger'],
  },
})
