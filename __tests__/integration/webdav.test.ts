import { describe, it, expect, beforeAll } from 'vitest'
import { WebDAVClient } from '../../common/webdav-client'

describe('WebDAV 集成测试 (与真实服务通信)', () => {
  const config = {
    url: process.env.WEBDAV_URL || 'http://localhost:8080',
    user: process.env.WEBDAV_USER || 'testuser',
    pass: process.env.WEBDAV_PASS || 'testpass',
  }

  let client: WebDAVClient

  beforeAll(() => {
    client = new WebDAVClient(config.url, config.user, config.pass)
  })

  it('应该能够成功连接并列出根目录', async () => {
    // 如果在 CI 环境下，WEBDAV_URL 应该已经由 rclone 准备好
    // 如果在本地运行且没有启动服务，此测试将跳过或失败
    try {
      const result = await client.checkConnection()
      expect(result).toBe(true)
    } catch (error) {
      if (!process.env.CI) {
        console.warn('跳过集成测试：未检测到本地 WebDAV 服务')
        return
      }
      throw error
    }
  })

  it('应该能够执行基本的 CRUD 操作', async () => {
    if (!process.env.CI && !(await client.checkConnection())) return

    const testFile = '/test-integration.txt'
    const content = 'hello integration'

    // 1. 写入文件
    await client.writeFile(testFile, content)

    // 2. 读取文件
    const readContent = await client.readFile(testFile)
    expect(readContent).toBe(content)

    // 3. 删除文件
    await client.deleteFile(testFile)
  })
})
