import type { BrowserContext } from '@playwright/test'
import path from 'path'

export async function getExtensionId(context: BrowserContext): Promise<string> {
  // 等待 service worker 启动，设置超时
  let [background] = context.serviceWorkers()
  if (!background) {
    console.log('Waiting for service worker...')
    try {
      background = await context.waitForEvent('serviceworker', { timeout: 30000 })
      console.log('Service worker found:', background.url())
    } catch (e) {
      console.error('Service worker not found:', e)
      // 列出所有 service workers
      const workers = context.serviceWorkers()
      console.log('Available service workers:', workers.length)
      workers.forEach((w, i) => console.log(`Worker ${i}:`, w.url()))
      throw new Error('Service worker not found')
    }
  } else {
    console.log('Service worker already available:', background.url())
  }

  const url = background.url()
  console.log('Service worker URL:', url)

  // 从 URL 中提取扩展 ID
  // URL 格式: chrome-extension://<extension-id>/...
  const match = url.match(/chrome-extension:\/\/([^/]+)/)
  if (!match) {
    throw new Error(`Could not extract extension ID from URL: ${url}`)
  }

  const extensionId = match[1]
  console.log('Extracted Extension ID:', extensionId)
  return extensionId
}

export function getExtensionPath(): string {
  return path.join(__dirname, '../../build/chrome-mv3-dev')
}
