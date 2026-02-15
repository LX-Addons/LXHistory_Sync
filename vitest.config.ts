import { defineConfig } from 'vitest/config'
import path from 'path'
import os from 'os'

const isCI = !!process.env.CI
const coverageDir = isCI ? path.join(os.tmpdir(), 'coverage') : './coverage'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/unit/**/*.test.ts', '**/__tests__/unit/**/*.test.tsx'],
    exclude: ['node_modules', 'build', '.plasmo'],
    outputFile: isCI ? path.join(os.tmpdir(), 'test-results', 'unit-test-results.xml') : undefined,
    reporters: isCI ? ['default', 'junit'] : ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text'],
      reportsDirectory: coverageDir,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      exclude: [
        'node_modules/**',
        'build/**',
        '.plasmo/**',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/vitest.config.ts',
        '**/vitest.setup.ts',
        '**/playwright.config.ts',
        '**/eslint.config.mjs',
        'coverage/**',
        'test-results/**',
        'e2e/**',
      ],
    },
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './'),
      '~store': path.resolve(__dirname, './store.ts'),
      '~common': path.resolve(__dirname, './common'),
      '~components': path.resolve(__dirname, './components'),
      '~hooks': path.resolve(__dirname, './hooks'),
    },
  },
})
