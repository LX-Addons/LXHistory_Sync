import { test, expect, chromium, type BrowserContext } from '@playwright/test'
import { getExtensionId, getExtensionPath } from './fixtures/extension'

test.describe('WebDAV 集成测试', () => {
  let context: BrowserContext
  let extensionId: string

  test.beforeAll(async () => {
    const extensionPath = getExtensionPath()
    context = await chromium.launchPersistentContext('', {
      headless: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    })

    // 等待一段时间确保扩展加载完成
    await new Promise(resolve => setTimeout(resolve, 2000))
    extensionId = await getExtensionId(context)
  })

  test.afterAll(async () => {
    if (context) {
      await context.close()
    }
  })

  test('应该能够连接到本地 WebDAV 服务', async () => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    const webdavUrl = process.env.WEBDAV_URL || 'http://localhost:8080'
    const webdavUser = process.env.WEBDAV_USER || 'testuser'
    const webdavPass = process.env.WEBDAV_PASS || 'testpass'

    const isConnected = await page.evaluate(
      async ({ url, user, pass }) => {
        try {
          const auth = btoa(`${user}:${pass}`)
          const response = await fetch(url, {
            method: 'PROPFIND',
            headers: {
              Authorization: `Basic ${auth}`,
              Depth: '0',
            },
          })
          return response.status === 200 || response.status === 207
        } catch (e) {
          console.error('WebDAV connection error:', e)
          return false
        }
      },
      { url: webdavUrl, user: webdavUser, pass: webdavPass }
    )

    expect(isConnected).toBe(true)
  })
})
