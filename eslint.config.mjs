// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ============================================================
// قوانین اضافی
// ============================================================

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  
  // ============================================================
  // ممنوعیت console.log در Production
  // ============================================================
  {
    rules: {
      'no-console': ['warn', { 
        allow: ['warn', 'error']
      }],
    },
  },
  
  // ============================================================
  // نادیده گرفتن فایل‌های خاص
  // ============================================================
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
  ]),
]);

export default eslintConfig;