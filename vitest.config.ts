import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/unit/**/*.test.ts', '**/__tests__/unit/**/*.test.tsx'],
    exclude: ['node_modules', 'build', '.plasmo'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './'),
    },
  },
})
