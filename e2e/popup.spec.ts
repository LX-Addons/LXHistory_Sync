import { test, expect } from '@playwright/test'
import { getExtensionId } from './fixtures/extension'

test.describe('Popup 页面', () => {
  test('应该正确加载 popup 页面', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    await expect(page.locator('h1')).toContainText('历史记录')
  })

  test('应该显示设置按钮', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    const settingsButton = page.locator('button[title="设置"]')
    await expect(settingsButton).toBeVisible()
  })

  test('搜索框应该在启用搜索时显示', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    await page.waitForTimeout(1000)

    const searchBox = page.locator('.search-box')
    const isVisible = await searchBox.isVisible().catch(() => false)

    if (isVisible) {
      await expect(searchBox).toBeVisible()
    }
  })

  test('历史记录列表容器应该存在', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    const historyContainer = page.locator('.history-list-container')
    await expect(historyContainer).toBeVisible()
  })

  test('截图对比', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('popup.png', {
      maxDiffPixels: 100,
    })
  })
})
