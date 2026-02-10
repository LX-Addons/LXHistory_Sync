import { test, expect } from '@playwright/test'
import { getExtensionId } from './fixtures/extension'

test.describe('Popup 页面', () => {
  test('应该正确加载 popup 页面', async ({ page, context }) => {
    // 等待 service worker 启动
    await context.waitForEvent('serviceworker')

    const extensionId = await getExtensionId(context)
    console.log('Extension ID:', extensionId)

    // 访问 popup 页面
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    // 等待页面加载
    await page.waitForLoadState('domcontentloaded')

    // 截图用于调试
    await page.screenshot({ path: 'test-results/popup-initial.png' })

    // 验证页面标题
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 10000 })
    await expect(h1).toContainText('历史记录')
  })

  test('应该显示设置按钮', async ({ page, context }) => {
    await context.waitForEvent('serviceworker')
    const extensionId = await getExtensionId(context)

    await page.goto(`chrome-extension://${extensionId}/popup.html`)
    await page.waitForLoadState('domcontentloaded')

    // 查找设置按钮（可能是图标或文字）
    const settingsButton = page
      .locator('button[title="设置"], button:has-text("设置"), .settings-btn')
      .first()
    await expect(settingsButton).toBeVisible({ timeout: 10000 })
  })

  test('历史记录列表容器应该存在', async ({ page, context }) => {
    await context.waitForEvent('serviceworker')
    const extensionId = await getExtensionId(context)

    await page.goto(`chrome-extension://${extensionId}/popup.html`)
    await page.waitForLoadState('domcontentloaded')

    // 使用类名选择器
    const historyContainer = page.locator('.history-list-container')
    await expect(historyContainer).toBeVisible({ timeout: 10000 })
  })
})
