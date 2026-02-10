import { test, expect } from '@playwright/test'
import { getExtensionId } from './fixtures/extension'

test.describe('Options 页面', () => {
  test('应该正确加载 options 页面', async ({ page, context }) => {
    // 等待 service worker 启动
    await context.waitForEvent('serviceworker')

    const extensionId = await getExtensionId(context)
    console.log('Extension ID:', extensionId)

    // 访问 options 页面
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // 等待页面加载
    await page.waitForLoadState('domcontentloaded')

    // 截图用于调试
    await page.screenshot({ path: 'test-results/options-initial.png' })

    // 验证页面标题
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 10000 })
    await expect(h1).toContainText('设置')
  })

  test('应该显示所有设置标签', async ({ page, context }) => {
    await context.waitForEvent('serviceworker')
    const extensionId = await getExtensionId(context)

    await page.goto(`chrome-extension://${extensionId}/options.html`)
    await page.waitForLoadState('domcontentloaded')

    // 验证标签存在
    await expect(page.locator('button').filter({ hasText: '常规' })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button').filter({ hasText: 'WebDAV' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('button').filter({ hasText: '主题' })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button').filter({ hasText: '安全' })).toBeVisible({ timeout: 10000 })
  })

  test('应该能切换到 WebDAV 标签', async ({ page, context }) => {
    await context.waitForEvent('serviceworker')
    const extensionId = await getExtensionId(context)

    await page.goto(`chrome-extension://${extensionId}/options.html`)
    await page.waitForLoadState('domcontentloaded')

    // 点击 WebDAV 标签
    await page.locator('button').filter({ hasText: 'WebDAV' }).click()

    // 截图用于调试
    await page.screenshot({ path: 'test-results/options-webdav.png' })

    // 验证 WebDAV 内容显示
    await expect(page.locator('text=服务器地址').or(page.locator('text=WebDAV'))).toBeVisible({
      timeout: 10000,
    })
  })
})
