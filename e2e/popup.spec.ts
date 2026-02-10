import { test, expect } from '@playwright/test'
import { getExtensionId } from './fixtures/extension'

test.describe('Popup 页面', () => {
  test('应该正确加载 popup 页面', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')

    // 验证页面标题或主要内容存在
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).toContainText('历史记录')
  })

  test('应该显示设置按钮', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    await page.waitForLoadState('networkidle')

    // 使用更通用的选择器
    const settingsButton = page.locator('button').filter({ hasText: /设置|⚙️/ })
    await expect(settingsButton.first()).toBeVisible()
  })

  test('历史记录列表容器应该存在', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    await page.waitForLoadState('networkidle')

    // 使用类名选择器
    const historyContainer = page.locator('.history-list-container')
    await expect(historyContainer).toBeVisible()
  })
})
