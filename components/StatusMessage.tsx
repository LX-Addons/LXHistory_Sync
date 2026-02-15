import { useEffect } from 'react'

export interface StatusMessageData {
  message: string
  type?: 'info' | 'success' | 'error'
  recovery?: string
}

interface StatusMessageProps {
  message: string | StatusMessageData | null
  type?: 'success' | 'error'
  duration?: number
  onClear?: () => void
  recovery?: string
}

export default function StatusMessage({
  message,
  type,
  duration = 3000,
  onClear,
  recovery,
}: StatusMessageProps) {
  useEffect(() => {
    if (!message || duration <= 0 || !onClear) {
      return
    }

    const timer = setTimeout(() => {
      onClear()
    }, duration)

    return () => {
      clearTimeout(timer)
    }
  }, [message, duration, onClear])

  if (!message) return null

  const messageText = typeof message === 'string' ? message : message.message
  const messageType = typeof message === 'string' ? type : message.type
  const recoveryText = typeof message === 'string' ? recovery : message.recovery

  const messageClass =
    messageType === 'error' || messageText.includes('失败') ? 'message-error' : 'message-success'

  return (
    <div className={`message ${messageClass}`}>
      <div className="message-text">{messageText}</div>
      {recoveryText && <div className="message-recovery">{recoveryText}</div>}
    </div>
  )
}
