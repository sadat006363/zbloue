// jest.config.cjs
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // 🔥 مهم: تمام node_modules را ترجمه کن، اما استثناهایی برای پکیج‌های ESM
  transformIgnorePatterns: [
    // این الگو باعث می‌شود Jest تمام node_modules را نادیده بگیرد، به جز موارد زیر
    '/node_modules/(?!(@babel/parser|@babel/traverse|@babel/types|@babel/helper-*|@babel/plugin-*|@babel/runtime|@babel/compat-data|groq-sdk|openai|anthropic-sdk)/)',
  ],
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'components/**/*.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

module.exports = createJestConfig(customJestConfig);