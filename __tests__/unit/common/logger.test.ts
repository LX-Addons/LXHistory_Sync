import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Logger, LogLevel, log } from '~/common/logger'

describe('logger', () => {
  describe('LogLevel', () => {
    it('应该正确定义日志级别', () => {
      expect(LogLevel.DEBUG).toBe(0)
      expect(LogLevel.INFO).toBe(1)
      expect(LogLevel.WARN).toBe(2)
      expect(LogLevel.ERROR).toBe(3)
      expect(LogLevel.NONE).toBe(4)
    })
  })

  describe('Logger', () => {
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('Logger.info 应该调用 console.info', () => {
      Logger.info('test message')
      expect(consoleInfoSpy).toHaveBeenCalled()
    })

    it('Logger.warn 应该调用 console.warn', () => {
      Logger.warn('test message')
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('Logger.error 应该调用 console.error', () => {
      Logger.error('test message')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('应该支持额外数据参数', () => {
      const data = { key: 'value' }
      Logger.info('test message', data)
      expect(consoleInfoSpy).toHaveBeenCalledWith(expect.any(String), data)
    })

    it('日志消息应该包含时间戳和级别', () => {
      Logger.info('test message')
      const call = consoleInfoSpy.mock.calls[0]
      expect(call[0]).toContain('[INFO]')
    })
  })

  describe('log function', () => {
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('log INFO 应该调用 Logger.info', () => {
      log(LogLevel.INFO, 'test message')
      expect(consoleInfoSpy).toHaveBeenCalled()
    })

    it('log WARN 应该调用 Logger.warn', () => {
      log(LogLevel.WARN, 'test message')
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('log ERROR 应该调用 Logger.error', () => {
      log(LogLevel.ERROR, 'test message')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('log NONE 不应该调用任何 console 方法', () => {
      log(LogLevel.NONE, 'test message')
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })
  })
})
