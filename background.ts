import { getLocalHistory } from "~common/history";
import { syncToCloud, log } from "~common/webdav";

let syncInterval: number | null = null;
const DEFAULT_SYNC_INTERVAL = 60 * 60 * 1000;
let isSyncing = false;

async function performScheduledSync() {
  if (isSyncing) {
    log(3, "Scheduled sync already in progress, skipping");
    return;
  }
  
  isSyncing = true;
  
  try {
    log(1, "Performing scheduled sync");
    const settings = await chrome.storage.local.get("general_config");
    const syncEnabled = settings.general_config?.autoSyncEnabled ?? false;
    
    if (!syncEnabled) {
      log(1, "Auto sync is disabled");
      return;
    }
    
    const webDavSettings = await chrome.storage.local.get("webdav_config");
    const { url, username, password } = webDavSettings.webdav_config || {};
    
    if (!url || !username || !password) {
      log(1, "WebDAV settings not configured");
      return;
    }
    
    const historyItems = await getLocalHistory();
    const rawHistoryItems = historyItems.map(item => item);
    
    const result = await syncToCloud(rawHistoryItems);
    log(1, "Scheduled sync completed:", result);
    
    if (result.success) {
      await chrome.storage.local.set({ lastSyncTime: new Date().toISOString() });
    }
  } catch (error) {
    log(3, "Scheduled sync failed:", error);
  } finally {
    isSyncing = false;
  }
}

function startSyncTimer() {
  clearSyncTimer();
  
  chrome.storage.local.get("general_config", (settings) => {
    const interval = settings.general_config?.syncInterval ?? DEFAULT_SYNC_INTERVAL;
    const syncEnabled = settings.general_config?.autoSyncEnabled ?? false;
    
    if (syncEnabled) {
      console.log(`LXHistory_Sync: Starting sync timer with interval ${interval}ms`);
      syncInterval = self.setInterval(performScheduledSync, interval);
    }
  });
}

function clearSyncTimer() {
  if (syncInterval !== null) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

self.addEventListener("install", (event) => {
  console.log("LXHistory_Sync: Service Worker installed");
});

self.addEventListener("activate", (event) => {
  console.log("LXHistory_Sync: Service Worker activated");
  startSyncTimer();
  
  performScheduledSync();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_DATA") {
    console.log("LXHistory_Sync: Sync requested from popup");
    performScheduledSync();
  } else if (event.data?.type === "UPDATE_SYNC_SETTINGS") {
    console.log("LXHistory_Sync: Sync settings updated");
    startSyncTimer();
  }
});

self.addEventListener("storage", (event) => {
  if (event.key === "general_config" || event.key === "webdav_config") {
    console.log("LXHistory_Sync: Settings changed, restarting sync timer");
    startSyncTimer();
  }
});
