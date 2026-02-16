import type { BrowserContext } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function getExtensionId(context: BrowserContext): Promise<string> {
  // 尝试从所有已打开的页面中寻找扩展 ID
  for (const page of context.pages()) {
    const url = page.url()
    if (url.startsWith('chrome-extension://')) {
      const match = url.match(/chrome-extension:\/\/([^/]+)/)
      if (match) return match[1]
    }
  }

  // 尝试从 background pages 寻找
  const backgroundPages = context.backgroundPages()
  if (backgroundPages.length > 0) {
    const url = backgroundPages[0].url()
    const match = url.match(/chrome-extension:\/\/([^/]+)/)
    if (match) return match[1]
  }

  // 尝试从 service workers 寻找
  const serviceWorkers = context.serviceWorkers()
  if (serviceWorkers.length > 0) {
    const url = serviceWorkers[0].url()
    const match = url.match(/chrome-extension:\/\/([^/]+)/)
    if (match) return match[1]
  }

  // 最后的手段：打开一个新页面并尝试获取
  const tempPage = await context.newPage()
  try {
    await tempPage.goto('about:blank')
    // 等待扩展加载
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 再次检查 service workers
    const sw = context.serviceWorkers()
    if (sw.length > 0) {
      const match = sw[0].url().match(/chrome-extension:\/\/([^/]+)/)
      if (match) return match[1]
    }
  } finally {
    await tempPage.close()
  }

  throw new Error('Could not get extension ID after multiple attempts')
}

export function getExtensionPath(): string {
  const buildDir = path.join(__dirname, '../../build')

  const possiblePaths = [
    path.join(buildDir, 'chrome-mv3-prod'),
    path.join(buildDir, 'chrome-mv3-dev'),
  ]

  for (const extPath of possiblePaths) {
    const manifestPath = path.join(extPath, 'manifest.json')
    if (fs.existsSync(manifestPath)) {
      console.log('Found extension at:', extPath)
      return extPath
    }
  }

  throw new Error(
    `Extension not found. Checked paths: ${possiblePaths.join(', ')}. Please run 'npm run build' first.`
  )
}
