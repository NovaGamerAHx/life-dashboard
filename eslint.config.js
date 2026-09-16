import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // الگوی «ریست فرم هنگام باز شدن مودال» عمداً استفاده شده — هشدار کافی است
      'react-hooks/set-state-in-effect': 'warn',
      // Date.now() در رندر برای نمایش زمان نسبی بی‌خطر است
      'react-hooks/purity': 'warn',
      // خروجی‌گرفتن ثابت‌ها کنار کامپوننت فقط روی HMR اثر دارد، نه صحت برنامه
      'react-refresh/only-export-components': 'warn',
    },
  },
])
