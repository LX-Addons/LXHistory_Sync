import { test, expect } from '@playwright/test'
import { getExtensionId } from './fixtures/extension'

test.describe('Options 页面', () => {
  test('应该正确加载 options 页面', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')

    // 验证页面标题
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).toContainText('设置')
  })

  test('应该显示所有设置标签', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    await page.waitForLoadState('networkidle')

    // 验证标签存在
    await expect(page.locator('button').filter({ hasText: '常规' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'WebDAV' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: '主题' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: '安全' })).toBeVisible()
  })

  test('应该能切换到 WebDAV 标签', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    await page.waitForLoadState('networkidle')

    // 点击 WebDAV 标签
    await page.locator('button').filter({ hasText: 'WebDAV' }).click()

    // 验证 WebDAV 内容显示
    await expect(page.locator('text=服务器地址').or(page.locator('text=WebDAV'))).toBeVisible()
  })
})
