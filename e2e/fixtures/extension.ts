import type { BrowserContext } from '@playwright/test'
import path from 'path'

export async function getExtensionId(context: BrowserContext): Promise<string> {
  let [background] = context.serviceWorkers()
  if (!background) {
    background = await context.waitForEvent('serviceworker')
  }

  const extensionId = background.url().split('/')[2]
  return extensionId
}

export function getExtensionPath(): string {
  return path.join(__dirname, '../../build/chrome-mv3-dev')
}
