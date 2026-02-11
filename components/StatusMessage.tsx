import { useEffect } from 'react'

interface StatusMessageData {
  message: string
  type?: 'info' | 'success' | 'error'
}

interface StatusMessageProps {
  message: string | StatusMessageData | null
  type?: 'success' | 'error'
  duration?: number
  onClear?: () => void
}

export default function StatusMessage({
  message,
  type,
  duration = 3000,
  onClear,
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

  const messageClass =
    messageType === 'error' || messageText.includes('失败') ? 'message-error' : 'message-success'

  return <div className={`message ${messageClass}`}>{messageText}</div>
}
