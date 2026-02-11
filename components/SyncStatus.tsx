import React from 'react'
import { type StatusMessageData } from './StatusMessage'

interface SyncStatusProps {
  status: StatusMessageData | null
}

const SyncStatus: React.FC<SyncStatusProps> = ({ status }) => {
  if (!status) {
    return null
  }

  const getMessageClass = () => {
    switch (status.type) {
      case 'success':
        return 'message message-success'
      case 'error':
        return 'message message-error'
      case 'info':
      default:
        return 'message message-info'
    }
  }

  return <div className={getMessageClass()}>{status.message}</div>
}

export default SyncStatus
