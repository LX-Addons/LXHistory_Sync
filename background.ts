import type { PlasmoBackgroundIndex } from "plasmo";
import { getLocalHistory } from "~common/history";
import { syncToCloud } from "~common/webdav";

export const config: PlasmoBackgroundIndex = {
  serviceWorker: {
    runAtInstall: true
  }
};

self.addEventListener("install", (event) => {
  console.log("LXHistory_Sync: Service Worker installed");
});

self.addEventListener("activate", (event) => {
  console.log("LXHistory_Sync: Service Worker activated");
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SYNC_DATA") {
    console.log("LXHistory_Sync: Sync requested from popup");
  }
});
