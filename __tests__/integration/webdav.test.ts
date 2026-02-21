import { describe, it, expect, beforeAll } from 'vitest'
import { createWebDAVClient } from '../../common/webdav-client'
import type { WebDAVConfig } from '../../common/types'

describe('WebDAV 集成测试 (与真实服务通信)', () => {
  const config: WebDAVConfig = {
    url: process.env.WEBDAV_URL || 'http://localhost:8080',
    username: process.env.WEBDAV_USER || 'testuser',
    password: process.env.WEBDAV_PASS || 'testpass',
    encryption: {
      enabled: false,
      type: 'aes-256-gcm',
    },
  }

  let client: { fetch: (path: string, options?: RequestInit) => Promise<Response> }

  beforeAll(async () => {
    client = await createWebDAVClient(config)
  })

  it('应该能够成功连接并列出根目录', async () => {
    try {
      const response = await client.fetch('/', {
        method: 'PROPFIND',
        headers: {
          Depth: '0',
        },
      })
      expect(response.status).toBe(207)
    } catch (error) {
      if (!process.env.CI) {
        console.warn('跳过集成测试：未检测到本地 WebDAV 服务')
        return
      }
      throw error
    }
  })

  it('应该能够执行基本的 CRUD 操作', async () => {
    if (!process.env.CI) {
      try {
        const check = await client.fetch('/', { method: 'PROPFIND', headers: { Depth: '0' } })
        if (!check.ok && check.status !== 207) return
      } catch {
        return
      }
    }

    const testFile = '/test-integration.txt'
    const content = 'hello integration'

    // 1. 写入文件 (PUT)
    const putResponse = await client.fetch(testFile, {
      method: 'PUT',
      body: content,
    })
    expect(putResponse.ok).toBe(true)

    // 2. 读取文件 (GET)
    const getResponse = await client.fetch(testFile, {
      method: 'GET',
    })
    expect(getResponse.ok).toBe(true)
    const readContent = await getResponse.text()
    expect(readContent).toBe(content)

    // 3. 删除文件 (DELETE)
    const deleteResponse = await client.fetch(testFile, {
      method: 'DELETE',
    })
    expect(deleteResponse.ok).toBe(true)
  })
})
