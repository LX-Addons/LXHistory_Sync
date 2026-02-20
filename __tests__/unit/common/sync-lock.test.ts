import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SyncLock } from '~/common/sync-lock'

const mockSessionStorage: Record<string, unknown> = {}

const mockSessionMethods = {
  get: vi.fn(async (key: string) => {
    return { [key]: mockSessionStorage[key] }
  }),
  set: vi.fn(async (data: Record<string, unknown>) => {
    Object.assign(mockSessionStorage, data)
  }),
  remove: vi.fn(async (key: string) => {
    delete mockSessionStorage[key]
  }),
}

vi.stubGlobal('chrome', {
  storage: {
    session: mockSessionMethods,
  },
})

describe('SyncLock', () => {
  beforeEach(() => {
    Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key])
  })

  describe('acquire', () => {
    it('should acquire lock when no lock exists', async () => {
      const acquired = await SyncLock.acquire()
      expect(acquired).toBe(true)

      const isLocked = await SyncLock.isLocked()
      expect(isLocked).toBe(true)
    })

    it('should acquire lock when previous lock expired', async () => {
      mockSessionStorage['sync_lock'] = {
        timestamp: Date.now() - 400000,
        instanceId: 'old-instance',
      }

      const acquired = await SyncLock.acquire()
      expect(acquired).toBe(true)
    })

    it('should allow reentrant lock for same instance', async () => {
      const acquired1 = await SyncLock.acquire()
      expect(acquired1).toBe(true)

      const acquired2 = await SyncLock.acquire()
      expect(acquired2).toBe(true)
    })

    it('should reject lock when held by another instance', async () => {
      mockSessionStorage['sync_lock'] = {
        timestamp: Date.now(),
        instanceId: 'other-instance',
      }

      const acquired = await SyncLock.acquire()
      expect(acquired).toBe(false)
    })
  })

  describe('release', () => {
    it('should release lock when owned by current instance', async () => {
      await SyncLock.acquire()
      await SyncLock.release()

      const isLocked = await SyncLock.isLocked()
      expect(isLocked).toBe(false)
    })

    it('should not release lock when not owned', async () => {
      mockSessionStorage['sync_lock'] = {
        timestamp: Date.now(),
        instanceId: 'other-instance',
      }

      await SyncLock.release()

      const lockInfo = await SyncLock.getLockInfo()
      expect(lockInfo).not.toBeNull()
    })
  })

  describe('isLocked', () => {
    it('should return false when no lock exists', async () => {
      const isLocked = await SyncLock.isLocked()
      expect(isLocked).toBe(false)
    })

    it('should return true when lock exists', async () => {
      await SyncLock.acquire()
      const isLocked = await SyncLock.isLocked()
      expect(isLocked).toBe(true)
    })

    it('should return false when lock expired', async () => {
      mockSessionStorage['sync_lock'] = {
        timestamp: Date.now() - 400000,
        instanceId: 'old-instance',
      }

      const isLocked = await SyncLock.isLocked()
      expect(isLocked).toBe(false)
    })
  })

  describe('getLockInfo', () => {
    it('should return null when no lock exists', async () => {
      const info = await SyncLock.getLockInfo()
      expect(info).toBeNull()
    })

    it('should return lock info when lock exists', async () => {
      await SyncLock.acquire()
      const info = await SyncLock.getLockInfo()
      expect(info).not.toBeNull()
      expect(info?.timestamp).toBeDefined()
      expect(info?.instanceId).toBeDefined()
    })

    it('should return null when lock expired', async () => {
      mockSessionStorage['sync_lock'] = {
        timestamp: Date.now() - 400000,
        instanceId: 'old-instance',
      }

      const info = await SyncLock.getLockInfo()
      expect(info).toBeNull()
    })
  })

  describe('lock flow', () => {
    it('should support acquire-release cycle', async () => {
      const acquired = await SyncLock.acquire()
      expect(acquired).toBe(true)

      const isLocked1 = await SyncLock.isLocked()
      expect(isLocked1).toBe(true)

      await SyncLock.release()

      const isLocked2 = await SyncLock.isLocked()
      expect(isLocked2).toBe(false)
    })

    it('should support multiple acquire-release cycles', async () => {
      for (let i = 0; i < 3; i++) {
        const acquired = await SyncLock.acquire()
        expect(acquired).toBe(true)

        await SyncLock.release()

        const isLocked = await SyncLock.isLocked()
        expect(isLocked).toBe(false)
      }
    })
  })

  describe('error handling', () => {
    it('should return false when isLocked encounters error', async () => {
      const originalGet = mockSessionMethods.get
      mockSessionMethods.get.mockRejectedValueOnce(new Error('Storage error'))

      const isLocked = await SyncLock.isLocked()
      expect(isLocked).toBe(false)

      mockSessionMethods.get = originalGet
    })

    it('should handle getLockInfo error gracefully', async () => {
      const originalGet = mockSessionMethods.get
      mockSessionMethods.get.mockRejectedValueOnce(new Error('Storage error'))

      const info = await SyncLock.getLockInfo()
      expect(info).toBeNull()

      mockSessionMethods.get = originalGet
    })

    it('should handle updateLockTimestamp error gracefully', async () => {
      await SyncLock.acquire()

      const originalSet = mockSessionMethods.set
      mockSessionMethods.set.mockRejectedValueOnce(new Error('Storage error'))

      await SyncLock.acquire()

      mockSessionMethods.set = originalSet
    })
  })
})
