import { Logger } from './logger'

interface LockData {
  timestamp: number
  instanceId: string
}

export class SyncLock {
  private static LOCK_KEY = 'sync_lock'
  private static LOCK_TIMEOUT = 300000

  private static instanceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  static async acquire(): Promise<boolean> {
    try {
      const result = await chrome.storage.session.get(SyncLock.LOCK_KEY)
      const lockData = result[SyncLock.LOCK_KEY] as LockData | undefined

      if (lockData) {
        const now = Date.now()
        if (now - lockData.timestamp < SyncLock.LOCK_TIMEOUT) {
          if (lockData.instanceId === SyncLock.instanceId) {
            await SyncLock.updateLockTimestamp()
            return true
          }
          Logger.warn('Sync lock is held by another instance')
          return false
        }
        Logger.warn('Lock expired, acquiring new lock')
      }

      await chrome.storage.session.set({
        [SyncLock.LOCK_KEY]: {
          timestamp: Date.now(),
          instanceId: SyncLock.instanceId,
        },
      })

      return true
    } catch (error) {
      Logger.error('Failed to acquire sync lock', error)
      return false
    }
  }

  static async release(): Promise<void> {
    try {
      const result = await chrome.storage.session.get(SyncLock.LOCK_KEY)
      const lockData = result[SyncLock.LOCK_KEY] as LockData | undefined

      if (lockData && lockData.instanceId === SyncLock.instanceId) {
        await chrome.storage.session.remove(SyncLock.LOCK_KEY)
        Logger.debug('Sync lock released')
      } else {
        Logger.warn('Cannot release lock: not owned by this instance')
      }
    } catch (error) {
      Logger.error('Failed to release sync lock', error)
    }
  }

  static async isLocked(): Promise<boolean> {
    try {
      const result = await chrome.storage.session.get(SyncLock.LOCK_KEY)
      const lockData = result[SyncLock.LOCK_KEY] as LockData | undefined

      if (!lockData) {
        return false
      }

      const now = Date.now()
      if (now - lockData.timestamp >= SyncLock.LOCK_TIMEOUT) {
        await chrome.storage.session.remove(SyncLock.LOCK_KEY)
        return false
      }

      return true
    } catch (error) {
      Logger.error('Failed to check sync lock status', error)
      return false
    }
  }

  private static async updateLockTimestamp(): Promise<void> {
    try {
      await chrome.storage.session.set({
        [SyncLock.LOCK_KEY]: {
          timestamp: Date.now(),
          instanceId: SyncLock.instanceId,
        },
      })
    } catch (error) {
      Logger.error('Failed to update lock timestamp', error)
    }
  }

  static async getLockInfo(): Promise<LockData | null> {
    try {
      const result = await chrome.storage.session.get(SyncLock.LOCK_KEY)
      return (result[SyncLock.LOCK_KEY] as LockData) || null
    } catch (error) {
      Logger.error('Failed to get lock info', error)
      return null
    }
  }
}
