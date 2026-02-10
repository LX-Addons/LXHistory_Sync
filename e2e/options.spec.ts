import { test, expect } from '@playwright/test'
import { getExtensionId } from './fixtures/extension'

test.describe('Options 页面', () => {
  test('应该正确加载 options 页面', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    await expect(page.locator('h1')).toContainText('设置')
  })

  test('应该显示所有设置标签', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    await expect(page.locator('button:has-text("常规")')).toBeVisible()
    await expect(page.locator('button:has-text("WebDAV")')).toBeVisible()
    await expect(page.locator('button:has-text("主题")')).toBeVisible()
    await expect(page.locator('button:has-text("安全")')).toBeVisible()
  })

  test('应该能切换到 WebDAV 标签', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    await page.click('button:has-text("WebDAV")')

    await expect(page.locator('text=WebDAV 服务器地址')).toBeVisible()
  })

  test('应该能切换到主题标签', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    await page.click('button:has-text("主题")')

    await expect(page.locator('text=主题设置')).toBeVisible()
  })

  test('WebDAV 表单应该可以填写', async ({ page, context }) => {
    const extensionId = await getExtensionId(context)
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    await page.click('button:has-text("WebDAV")')

    await page.fill('input#url', 'https://dav.example.com')
    await page.fill('input#username', 'testuser')
    await page.fill('input#password', 'testpass')

    await expect(page.locator('input#url')).toHaveValue('https://dav.example.com')
    await expect(page.locator('input#username')).toHaveValue('testuser')
  })
})
