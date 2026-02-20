import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  Logger,
  LogLevel,
  setLogLevel,
  setModuleLogLevel,
  getModuleLogLevel,
} from '~/common/logger'

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
    let consoleDebugSpy: ReturnType<typeof vi.spyOn>
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      setLogLevel(LogLevel.INFO)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('Logger.debug 应该在 DEBUG 级别下调用 console.debug', () => {
      setLogLevel(LogLevel.DEBUG)
      Logger.debug('test message')
      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    it('Logger.debug 不应该在 INFO 级别下调用 console.debug', () => {
      setLogLevel(LogLevel.INFO)
      Logger.debug('test message')
      expect(consoleDebugSpy).not.toHaveBeenCalled()
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

  describe('log level filtering', () => {
    let consoleDebugSpy: ReturnType<typeof vi.spyOn>
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('NONE level should not log anything', () => {
      setLogLevel(LogLevel.NONE)
      Logger.debug('test')
      Logger.info('test')
      Logger.warn('test')
      Logger.error('test')
      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('ERROR level should only log errors', () => {
      setLogLevel(LogLevel.ERROR)
      Logger.debug('test')
      Logger.info('test')
      Logger.warn('test')
      Logger.error('test')
      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('WARN level should log warn and error', () => {
      setLogLevel(LogLevel.WARN)
      Logger.debug('test')
      Logger.info('test')
      Logger.warn('test')
      Logger.error('test')
      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('INFO level should log info, warn and error', () => {
      setLogLevel(LogLevel.INFO)
      Logger.debug('test')
      Logger.info('test')
      Logger.warn('test')
      Logger.error('test')
      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('DEBUG level should log everything', () => {
      setLogLevel(LogLevel.DEBUG)
      Logger.debug('test')
      Logger.info('test')
      Logger.warn('test')
      Logger.error('test')
      expect(consoleDebugSpy).toHaveBeenCalled()
      expect(consoleInfoSpy).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('module log levels', () => {
    let consoleDebugSpy: ReturnType<typeof vi.spyOn>
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      setLogLevel(LogLevel.INFO)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should set and get module log level', () => {
      setModuleLogLevel('test-module', LogLevel.DEBUG)
      expect(getModuleLogLevel('test-module')).toBe(LogLevel.DEBUG)
    })

    it('should return undefined for unset module', () => {
      expect(getModuleLogLevel('unset-module')).toBeUndefined()
    })

    it('should use module log level for debug', () => {
      setModuleLogLevel('debug-module', LogLevel.DEBUG)
      Logger.debug('test message', undefined, 'debug-module')
      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    it('should use module log level for info', () => {
      setModuleLogLevel('info-module', LogLevel.INFO)
      Logger.info('test message', undefined, 'info-module')
      expect(consoleInfoSpy).toHaveBeenCalled()
    })

    it('should include module name in log prefix', () => {
      setModuleLogLevel('my-module', LogLevel.INFO)
      Logger.info('test message', undefined, 'my-module')
      const call = consoleInfoSpy.mock.calls[0]
      expect(call[0]).toContain('[my-module]')
    })

    it('should fallback to global level when module level not set', () => {
      setLogLevel(LogLevel.WARN)
      Logger.info('test message', undefined, 'unknown-module')
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      Logger.warn('test message', undefined, 'unknown-module')
      expect(consoleInfoSpy).not.toHaveBeenCalled()
    })
  })
})
