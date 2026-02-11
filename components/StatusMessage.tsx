import { useEffect } from 'react'

interface StatusMessageProps {
  message: string
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

  const messageClass =
    type === 'error' || message.includes('失败') ? 'message-error' : 'message-success'

  return <div className={`message ${messageClass}`}>{message}</div>
}
