import { defineConfig, devices } from '@playwright/test'
import path from 'path'

// CI 环境中使用 production 构建，本地使用 development 构建
const extensionPath = process.env.CI
  ? path.join(__dirname, 'build/chrome-mv3-prod')
  : path.join(__dirname, 'build/chrome-mv3-dev')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // 扩展测试需要串行
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 扩展测试必须单 worker
  reporter: [['html'], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    headless: false, // 扩展测试需要 headed 模式
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ],
        },
      },
    },
  ],
})
