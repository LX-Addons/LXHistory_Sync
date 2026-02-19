export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

let currentLogLevel = process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.INFO

const moduleLogLevels: Record<string, LogLevel> = {}

export function setLogLevel(level: LogLevel) {
  currentLogLevel = level
}

export function setModuleLogLevel(module: string, level: LogLevel) {
  moduleLogLevels[module] = level
}

export function getModuleLogLevel(module: string): LogLevel | undefined {
  return moduleLogLevels[module]
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString()
  const levelName = LogLevel[level]
  return `[${timestamp}] [${levelName}] ${message}`
}

function shouldLog(level: LogLevel, specificLevel?: LogLevel): boolean {
  return level >= (specificLevel ?? currentLogLevel)
}

export class Logger {
  static debug(message: string, data?: unknown, module?: string): void {
    const level = module ? (moduleLogLevels[module] ?? currentLogLevel) : currentLogLevel
    if (shouldLog(LogLevel.DEBUG, level)) {
      const prefix = module ? `[${module}] ` : ''
      console.debug(formatMessage(LogLevel.DEBUG, prefix + message), data)
    }
  }

  static info(message: string, data?: unknown, module?: string): void {
    const level = module ? (moduleLogLevels[module] ?? currentLogLevel) : currentLogLevel
    if (shouldLog(LogLevel.INFO, level)) {
      const prefix = module ? `[${module}] ` : ''
      console.info(formatMessage(LogLevel.INFO, prefix + message), data)
    }
  }

  static warn(message: string, data?: unknown, module?: string): void {
    const level = module ? (moduleLogLevels[module] ?? currentLogLevel) : currentLogLevel
    if (shouldLog(LogLevel.WARN, level)) {
      const prefix = module ? `[${module}] ` : ''
      console.warn(formatMessage(LogLevel.WARN, prefix + message), data)
    }
  }

  static error(message: string, data?: unknown, module?: string): void {
    const level = module ? (moduleLogLevels[module] ?? currentLogLevel) : currentLogLevel
    if (shouldLog(LogLevel.ERROR, level)) {
      const prefix = module ? `[${module}] ` : ''
      console.error(formatMessage(LogLevel.ERROR, prefix + message), data)
    }
  }
}

export function log(level: LogLevel, message: string, data?: unknown): void {
  switch (level) {
    case LogLevel.DEBUG:
      Logger.debug(message, data)
      break
    case LogLevel.INFO:
      Logger.info(message, data)
      break
    case LogLevel.WARN:
      Logger.warn(message, data)
      break
    case LogLevel.ERROR:
      Logger.error(message, data)
      break
  }
}
