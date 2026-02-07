export const STORAGE_KEYS = {
  WEBDAV_CONFIG: "webdav_config",
  SYNC_STATUS: "sync_status",
  THEME_CONFIG: "theme_config",
  GENERAL_CONFIG: "general_config"
};

export type SyncStatusType = "idle" | "syncing_to_cloud" | "syncing_from_cloud" | "synced_to_cloud" | "synced_from_cloud" | "error";

export const SYNC_MESSAGES = {
  SYNCING_TO_CLOUD: "正在同步到云端...",
  SYNCING_FROM_CLOUD: "正在从云端同步...",
  SYNCED_TO_CLOUD: "同步到云端成功！已合并数据。",
  SYNCED_FROM_CLOUD: (count: number) => `从云端同步成功！获取到 ${count} 条记录。`,
  ERROR: (error: string) => `同步失败: ${error}`
};

export const ERROR_MESSAGES = {
  NO_CONFIG: "WebDAV 配置未设置",
  SYNC_FAILED: "同步失败，请检查网络连接和 WebDAV 配置",
  LOAD_HISTORY_FAILED: "加载本地历史失败",
  SAVE_CONFIG_FAILED: "保存配置失败",
  INVALID_URL: "无效的 WebDAV 服务器地址",
  INVALID_CREDENTIALS: "无效的用户名或密码"
};

export const SUCCESS_MESSAGES = {
  CONFIG_SAVED: "保存成功！",
  HISTORY_LOADED: "历史记录加载成功"
};

export const DEFAULT_CONFIG = {
  url: "",
  username: "",
  password: "",
  encryption: {
    enabled: false,
    type: "none"
  }
};

export const DEFAULT_GENERAL_CONFIG = {
  searchEnabled: true,
  checkboxStyle: "toggle",
  collapseDomainHistory: false,
  showUrls: false,
  iconSource: "byteance"
};

export const DEFAULT_THEME_CONFIG = {
  theme: "auto"
};

export const DEFAULT_HISTORY: any[] = [];

export const MAX_HISTORY_ITEMS = 1000;

export const WEBDAV_FILENAME = "history.json";

export interface AppState {
  historyItems: any[];
  syncStatus: SyncStatusType;
  error: string | null;
  isLoading: boolean;
  config: {
    url: string;
    username: string;
    password: string;
  };
}

export const INITIAL_STATE: AppState = {
  historyItems: DEFAULT_HISTORY,
  syncStatus: "idle",
  error: null,
  isLoading: false,
  config: DEFAULT_CONFIG
};