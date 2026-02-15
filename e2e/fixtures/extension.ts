import type { BrowserContext } from '@playwright/test'
import path from 'path'
import fs from 'fs'

export async function getExtensionId(context: BrowserContext): Promise<string> {
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
