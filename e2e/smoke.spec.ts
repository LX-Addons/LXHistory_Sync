import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('冒烟测试', () => {
  test('构建产物应该存在', async () => {
    // 验证构建产物存在
    const fs = await import('fs')

    // 在 CI 环境中，artifact 下载后路径是 build/chrome-mv3-prod/
    // 在本地环境中，路径是 build/chrome-mv3-dev/
    const possiblePaths = [
      path.join(__dirname, '../build/chrome-mv3-prod'),
      path.join(__dirname, '../build/chrome-mv3-dev'),
      path.join(__dirname, '../build'), // artifact 可能直接解压到 build/
    ]

    let extensionPath = ''
    for (const p of possiblePaths) {
      console.log('Checking path:', p)
      if (fs.existsSync(path.join(p, 'manifest.json'))) {
        extensionPath = p
        console.log('✅ Found valid extension at:', p)
        break
      }
    }

    // 如果没有找到，列出 build 目录内容帮助调试
    if (!extensionPath) {
      const buildPath = path.join(__dirname, '../build')
      console.log('Build directory exists:', fs.existsSync(buildPath))
      if (fs.existsSync(buildPath)) {
        const contents = fs.readdirSync(buildPath)
        console.log('Build directory contents:', contents)
      }
    }

    expect(extensionPath).not.toBe('')

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

    // 查找有效的扩展路径
    const possiblePaths = [
      path.join(__dirname, '../build/chrome-mv3-prod'),
      path.join(__dirname, '../build/chrome-mv3-dev'),
      path.join(__dirname, '../build'),
    ]

    let extensionPath = ''
    for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, 'manifest.json'))) {
        extensionPath = p
        break
      }
    }

    expect(extensionPath).not.toBe('')

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

    // 查找有效的扩展路径
    const possiblePaths = [
      path.join(__dirname, '../build/chrome-mv3-prod'),
      path.join(__dirname, '../build/chrome-mv3-dev'),
      path.join(__dirname, '../build'),
    ]

    let extensionPath = ''
    for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, 'manifest.json'))) {
        extensionPath = p
        break
      }
    }

    expect(extensionPath).not.toBe('')

    const optionsPath = path.join(extensionPath, 'options.html')
    const content = fs.readFileSync(optionsPath, 'utf-8')

    // 验证包含基本 HTML 结构
    expect(content).toContain('<html')
    expect(content).toContain('<body')
    expect(content).toContain('</html>')

    console.log('✅ options.html content verified')
  })
})
