import { getLocalHistory } from "~common/history";
import { syncToCloud } from "~common/webdav";

let syncInterval: number | null = null;
const DEFAULT_SYNC_INTERVAL = 60 * 60 * 1000; // 默认1小时

async function performScheduledSync() {
  console.log("LXHistory_Sync: Performing scheduled sync");
  try {
    const settings = await chrome.storage.local.get("generalSettings");
    const syncEnabled = settings.generalSettings?.autoSyncEnabled ?? false;
    const syncInterval = settings.generalSettings?.syncInterval ?? DEFAULT_SYNC_INTERVAL;
    
    if (!syncEnabled) {
      console.log("LXHistory_Sync: Auto sync is disabled");
      return;
    }
    
    const webDavSettings = await chrome.storage.local.get("webDavSettings");
    const { url, username, password, encryptionEnabled } = webDavSettings.webDavSettings || {};
    
    if (!url || !username || !password) {
      console.log("LXHistory_Sync: WebDAV settings not configured");
      return;
    }
    
    const historyItems = await getLocalHistory();
    const rawHistoryItems = historyItems.map(item => item);
    
    const result = await syncToCloud(rawHistoryItems);
    console.log("LXHistory_Sync: Scheduled sync completed:", result);
    
    await chrome.storage.local.set({ lastSyncTime: new Date().toISOString() });
  } catch (error) {
    console.error("LXHistory_Sync: Scheduled sync failed:", error);
  }
}

function startSyncTimer() {
  clearSyncTimer();
  
  chrome.storage.local.get("generalSettings", (settings) => {
    const interval = settings.generalSettings?.syncInterval ?? DEFAULT_SYNC_INTERVAL;
    const syncEnabled = settings.generalSettings?.autoSyncEnabled ?? false;
    
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
  (event as any).skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("LXHistory_Sync: Service Worker activated");
  (event as any).waitUntil((self as any).clients.claim());
  startSyncTimer();
  
  // 立即执行一次同步
  performScheduledSync();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SYNC_DATA") {
    console.log("LXHistory_Sync: Sync requested from popup");
    performScheduledSync();
  } else if (event.data && event.data.type === "UPDATE_SYNC_SETTINGS") {
    console.log("LXHistory_Sync: Sync settings updated");
    startSyncTimer();
  }
});

self.addEventListener("storage", (event) => {
  if (event.key === "generalSettings" || event.key === "webDavSettings") {
    console.log("LXHistory_Sync: Settings changed, restarting sync timer");
    startSyncTimer();
  }
});
