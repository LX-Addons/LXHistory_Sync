import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('冒烟测试', () => {
  test('构建产物应该存在', async () => {
    // 验证构建产物存在
    const fs = await import('fs')
    const extensionPath = process.env.CI
      ? path.join(__dirname, '../build/chrome-mv3-prod')
      : path.join(__dirname, '../build/chrome-mv3-dev')

    console.log('Checking extension path:', extensionPath)

    // 验证 manifest.json 存在
    const manifestPath = path.join(extensionPath, 'manifest.json')
    expect(fs.existsSync(manifestPath)).toBe(true)

    // 验证 popup.html 存在
    const popupPath = path.join(extensionPath, 'popup.html')
    expect(fs.existsSync(popupPath)).toBe(true)

    // 验证 options.html 存在
    const optionsPath = path.join(extensionPath, 'options.html')
    expect(fs.existsSync(optionsPath)).toBe(true)

    // 读取并验证 manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    expect(manifest.manifest_version).toBe(3)
    expect(manifest.name).toBe('LXHistory_Sync')
    expect(manifest.permissions).toContain('history')
    expect(manifest.permissions).toContain('storage')

    console.log('✅ Build artifacts verified')
  })

  test('popup.html 应该包含正确的内容', async () => {
    const fs = await import('fs')
    const extensionPath = process.env.CI
      ? path.join(__dirname, '../build/chrome-mv3-prod')
      : path.join(__dirname, '../build/chrome-mv3-dev')

    const popupPath = path.join(extensionPath, 'popup.html')
    const content = fs.readFileSync(popupPath, 'utf-8')

    // 验证包含基本 HTML 结构
    expect(content).toContain('<html')
    expect(content).toContain('<body')
    expect(content).toContain('</html>')

    console.log('✅ popup.html content verified')
  })

  test('options.html 应该包含正确的内容', async () => {
    const fs = await import('fs')
    const extensionPath = process.env.CI
      ? path.join(__dirname, '../build/chrome-mv3-prod')
      : path.join(__dirname, '../build/chrome-mv3-dev')

    const optionsPath = path.join(extensionPath, 'options.html')
    const content = fs.readFileSync(optionsPath, 'utf-8')

    // 验证包含基本 HTML 结构
    expect(content).toContain('<html')
    expect(content).toContain('<body')
    expect(content).toContain('</html>')

    console.log('✅ options.html content verified')
  })
})
