import { defineConfig } from 'vitest/config'
import path from 'path'
import os from 'os'

const isCI = !!process.env.CI

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/unit/**/*.test.ts', '**/__tests__/unit/**/*.test.tsx'],
    exclude: ['node_modules', 'build', '.plasmo'],
    outputFile: isCI ? path.join(os.tmpdir(), 'test-results', 'unit-test-results.xml') : undefined,
    reporters: isCI ? ['default', 'junit'] : ['default'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './'),
    },
  },
})
