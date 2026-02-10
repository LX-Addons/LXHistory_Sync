export const STORAGE_KEYS = {
  WEBDAV_CONFIG: 'webdav_config',
  SYNC_STATUS: 'sync_status',
  THEME_CONFIG: 'theme_config',
  GENERAL_CONFIG: 'general_config',
}

export const DEFAULT_GENERAL_CONFIG = {
  searchEnabled: true,
  checkboxStyle: 'toggle',
  collapseDomainHistory: false,
  showUrls: false,
  iconSource: 'byteance',
  autoSyncEnabled: false,
  syncInterval: 3600000,
}

export const DEFAULT_THEME_CONFIG = {
  theme: 'auto',
}

export const WEBDAV_FILENAME = 'history.json'
