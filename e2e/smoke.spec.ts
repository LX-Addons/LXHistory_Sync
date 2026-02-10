import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

function findExtensionPath(): string {
  const possiblePaths = [
    path.join(__dirname, '../build/chrome-mv3-prod'),
    path.join(__dirname, '../build/chrome-mv3-dev'),
    path.join(__dirname, '../build'),
  ]

  for (const p of possiblePaths) {
    console.log('Checking path:', p)
    if (fs.existsSync(path.join(p, 'manifest.json'))) {
      console.log('✅ Found valid extension at:', p)
      return p
    }
  }

  const buildPath = path.join(__dirname, '../build')
  console.log('Build directory exists:', fs.existsSync(buildPath))
  if (fs.existsSync(buildPath)) {
    console.log('Build directory contents:', fs.readdirSync(buildPath))
  }

  return ''
}

function verifyHtmlContent(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8')
  expect(content).toContain('<html')
  expect(content).toContain('<body')
  expect(content).toContain('</html>')
}

test.describe('冒烟测试', () => {
  test('构建产物应该存在', () => {
    const extensionPath = findExtensionPath()
    expect(extensionPath).not.toBe('')

    expect(fs.existsSync(path.join(extensionPath, 'manifest.json'))).toBe(true)
    expect(fs.existsSync(path.join(extensionPath, 'popup.html'))).toBe(true)
    expect(fs.existsSync(path.join(extensionPath, 'options.html'))).toBe(true)

    const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath, 'manifest.json'), 'utf-8'))
    expect(manifest.manifest_version).toBe(3)
    expect(manifest.name).toBe('LXHistory_Sync')
    expect(manifest.permissions).toContain('history')
    expect(manifest.permissions).toContain('storage')

    console.log('✅ Build artifacts verified')
  })

  test('popup.html 应该包含正确的内容', () => {
    const extensionPath = findExtensionPath()
    expect(extensionPath).not.toBe('')

    verifyHtmlContent(path.join(extensionPath, 'popup.html'))
    console.log('✅ popup.html content verified')
  })

  test('options.html 应该包含正确的内容', () => {
    const extensionPath = findExtensionPath()
    expect(extensionPath).not.toBe('')

    verifyHtmlContent(path.join(extensionPath, 'options.html'))
    console.log('✅ options.html content verified')
  })
})
