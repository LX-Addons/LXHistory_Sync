export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

let currentLogLevel = process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.INFO

export function setLogLevel(level: LogLevel) {
  currentLogLevel = level
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString()
  const levelName = LogLevel[level]
  return `[${timestamp}] [${levelName}] ${message}`
}

function shouldLog(level: LogLevel): boolean {
  return level >= currentLogLevel
}

export class Logger {
  static debug(message: string, data?: unknown): void {
    if (shouldLog(LogLevel.DEBUG)) {
      console.debug(formatMessage(LogLevel.DEBUG, message), data)
    }
  }

  static info(message: string, data?: unknown): void {
    if (shouldLog(LogLevel.INFO)) {
      console.info(formatMessage(LogLevel.INFO, message), data)
    }
  }

  static warn(message: string, data?: unknown): void {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(formatMessage(LogLevel.WARN, message), data)
    }
  }

  static error(message: string, data?: unknown): void {
    if (shouldLog(LogLevel.ERROR)) {
      console.error(formatMessage(LogLevel.ERROR, message), data)
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
