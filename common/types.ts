export interface HistoryItem {
  id: string
  url: string
  title?: string
  lastVisitTime: number
  visitCount: number
}

export type EncryptionType =
  | 'none'
  | 'aes-256-cbc'
  | 'aes-256-gcm'
  | 'aes-256-ctr'
  | 'chacha20-poly1305'

export type KeyStrength = 'weak' | 'medium' | 'strong'

export interface EncryptionConfig {
  enabled: boolean
  type: EncryptionType
  key?: string
  salt?: string
  keyStrength?: KeyStrength
}

export interface WebDAVConfig {
  url: string
  username: string
  password?: string
  encryption: EncryptionConfig
  isValid?: boolean
  lastValidated?: number
}

export type SyncStatus = 'info' | 'success' | 'error'

export interface SyncMessage {
  message: string
  type: SyncStatus
}

export interface CloudSyncResult {
  success: boolean
  items?: HistoryItem[]
  error?: string
  message?: string
  recovery?: string
}

export type ThemeType = 'auto' | 'light' | 'dark'

export interface ThemeConfig {
  theme: ThemeType
}

export type CheckboxStyleType = 'default' | 'modern' | 'minimal' | 'classic' | 'rounded' | 'toggle'

export type IconSourceType = 'byteance' | 'google' | 'baidu' | 'duckduckgo' | 'letter' | 'none'

export interface GeneralConfig {
  searchEnabled: boolean
  checkboxStyle: CheckboxStyleType
  collapseDomainHistory: boolean
  showUrls: boolean
  iconSource: IconSourceType
  autoSyncEnabled: boolean
  syncInterval: number
  maxHistoryItems: number
}

export interface HistoryItemProps {
  item: HistoryItem
  onClick?: (item: HistoryItem) => void
}

export interface SyncStatusProps {
  status: SyncMessage | null
}

export interface ConfigFormProps {
  config: WebDAVConfig
  status: string
  onConfigChange: (config: WebDAVConfig) => void
  onSubmit: (e: React.FormEvent) => void
  checkboxStyle?: CheckboxStyleType
}
