import type { BrowserContext } from '@playwright/test'
import path from 'path'

export async function getExtensionId(context: BrowserContext): Promise<string> {
  // 尝试多种方式获取扩展 ID

  // 方式1: 通过 service worker
  let [background] = context.serviceWorkers()
  if (background) {
    const url = background.url()
    console.log('Found service worker:', url)
    const match = url.match(/chrome-extension:\/\/([^/]+)/)
    if (match) {
      console.log('Extracted Extension ID from service worker:', match[1])
      return match[1]
    }
  }

  // 方式2: 等待 service worker 启动
  console.log('Waiting for service worker...')
  try {
    background = await context.waitForEvent('serviceworker', { timeout: 10000 })
    const url = background.url()
    console.log('Service worker found:', url)
    const match = url.match(/chrome-extension:\/\/([^/]+)/)
    if (match) {
      console.log('Extracted Extension ID:', match[1])
      return match[1]
    }
  } catch (e) {
    console.log('Service worker not found, trying other methods...')
  }

  // 方式3: 通过 background page (Manifest V2)
  const pages = context.backgroundPages()
  if (pages.length > 0) {
    const url = pages[0].url()
    console.log('Found background page:', url)
    const match = url.match(/chrome-extension:\/\/([^/]+)/)
    if (match) {
      console.log('Extracted Extension ID from background page:', match[1])
      return match[1]
    }
  }

  // 方式4: 尝试从页面获取
  console.log('Trying to get extension ID from page...')
  const page = context.pages()[0]
  if (page) {
    try {
      const extensionId = await page.evaluate(() => {
        return (window as { chrome?: { runtime?: { id?: string } } }).chrome?.runtime?.id
      })
      if (extensionId) {
        console.log('Found extension ID from page:', extensionId)
        return extensionId
      }
    } catch (e) {
      console.log('Could not get extension ID from page')
    }
  }

  throw new Error('Could not get extension ID')
}

export function getExtensionPath(): string {
  return path.join(__dirname, '../../build/chrome-mv3-dev')
}
