interface SyncProgressProps {
  isSyncing: boolean
  message?: string
}

export default function SyncProgress({ isSyncing, message }: SyncProgressProps) {
  if (!isSyncing) return null

  return (
    <div className="sync-progress">
      <div className="sync-spinner">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="sync-spinner-icon"
        >
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
      </div>
      <span className="sync-message">{message || '同步中...'}</span>
    </div>
  )
}
