import { Storage } from "@plasmohq/storage";
import type { HistoryItem, WebDAVConfig, AppError, CloudSyncResult } from "./types";
import { mergeHistory } from "./history";
import { ERROR_MESSAGES, WEBDAV_FILENAME } from "~store";

const storage = new Storage();

async function encrypt(data: any, key: string, type: string): Promise<string> {
  try {
    const jsonData = JSON.stringify(data);
    
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(key),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    
    let encryptionKey: CryptoKey;
    let algorithm: AlgorithmIdentifier | RsaOaepParams | AesCtrParams | AesCbcParams | AesGcmParams;
    let iv: Uint8Array;
    let additionalData: Uint8Array;
    let combined: Uint8Array;
    
    switch (type) {
      case "aes-256-gcm":
        encryptionKey = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: encoder.encode("LXHistory_Sync"),
            iterations: 100000,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt"]
        );
        iv = crypto.getRandomValues(new Uint8Array(12));
        additionalData = encoder.encode("LXHistory_Sync");
        algorithm = {
          name: "AES-GCM",
          iv,
          additionalData
        };
        break;
      case "aes-256-ctr":
        encryptionKey = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: encoder.encode("LXHistory_Sync"),
            iterations: 100000,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "AES-CTR", length: 256 },
          false,
          ["encrypt"]
        );
        iv = crypto.getRandomValues(new Uint8Array(16));
        algorithm = {
          name: "AES-CTR",
          counter: iv,
          length: 128
        };
        break;
      case "chacha20-poly1305":
        encryptionKey = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: encoder.encode("LXHistory_Sync"),
            iterations: 100000,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "ChaCha20-Poly1305", length: 256 },
          false,
          ["encrypt"]
        );
        iv = crypto.getRandomValues(new Uint8Array(12));
        additionalData = encoder.encode("LXHistory_Sync");
        algorithm = {
          name: "ChaCha20-Poly1305",
          counter: iv,
          length: 96,
          additionalData
        };
        break;
      case "aes-256-cbc":
      default:
        encryptionKey = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: encoder.encode("LXHistory_Sync"),
            iterations: 100000,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "AES-CBC", length: 256 },
          false,
          ["encrypt"]
        );
        iv = crypto.getRandomValues(new Uint8Array(16));
        algorithm = {
          name: "AES-CBC",
          iv
        };
        break;
    }
    
    const encrypted = await crypto.subtle.encrypt(
      algorithm,
      encryptionKey,
      encoder.encode(jsonData)
    );
    
    combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("加密失败");
  }
}

async function decrypt(encryptedData: string, key: string, type: string): Promise<any> {
  try {
    const binaryData = atob(encryptedData);
    const combined = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      combined[i] = binaryData.charCodeAt(i);
    }
    
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(key),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    
    let decryptionKey: CryptoKey;
    let algorithm: AlgorithmIdentifier | RsaOaepParams | AesCtrParams | AesCbcParams | AesGcmParams;
    let iv: Uint8Array;
    let encrypted: Uint8Array;
    let additionalData: Uint8Array;
    
    switch (type) {
      case "aes-256-gcm":
        decryptionKey = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: encoder.encode("LXHistory_Sync"),
            iterations: 100000,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );
        iv = combined.slice(0, 12);
        encrypted = combined.slice(12);
        additionalData = encoder.encode("LXHistory_Sync");
        algorithm = {
          name: "AES-GCM",
          iv,
          additionalData
        };
        break;
      case "aes-256-ctr":
        decryptionKey = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: encoder.encode("LXHistory_Sync"),
            iterations: 100000,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "AES-CTR", length: 256 },
          false,
          ["decrypt"]
        );
        iv = combined.slice(0, 16);
        encrypted = combined.slice(16);
        algorithm = {
          name: "AES-CTR",
          counter: iv,
          length: 128
        };
        break;
      case "chacha20-poly1305":
        decryptionKey = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: encoder.encode("LXHistory_Sync"),
            iterations: 100000,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "ChaCha20-Poly1305", length: 256 },
          false,
          ["decrypt"]
        );
        iv = combined.slice(0, 12);
        encrypted = combined.slice(12);
        additionalData = encoder.encode("LXHistory_Sync");
        algorithm = {
          name: "ChaCha20-Poly1305",
          counter: iv,
          length: 96,
          additionalData
        };
        break;
      case "aes-256-cbc":
      default:
        decryptionKey = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: encoder.encode("LXHistory_Sync"),
            iterations: 100000,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "AES-CBC", length: 256 },
          false,
          ["decrypt"]
        );
        iv = combined.slice(0, 16);
        encrypted = combined.slice(16);
        algorithm = {
          name: "AES-CBC",
          iv
        };
        break;
    }
    
    const decrypted = await crypto.subtle.decrypt(
      algorithm,
      decryptionKey,
      encrypted
    );
    
    const decoder = new TextDecoder();
    const jsonData = decoder.decode(decrypted);
    
    return JSON.parse(jsonData);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("解密失败，请检查加密密钥是否正确");
  }
}

async function getConfig(): Promise<WebDAVConfig | null> {
  return await storage.get("webdav_config");
}

function validateConfig(config: WebDAVConfig): boolean {
  return !!config && !!config.url && !!config.username;
}

function createError(message: string, type: string, originalError?: any): never {
  const error = new Error(message);
  (error as any).type = type;
  (error as any).originalError = originalError;
  throw error;
}

export async function syncToCloud(localHistory: HistoryItem[]): Promise<CloudSyncResult> {
  try {
    const config = await getConfig();
    
    if (!config || !validateConfig(config)) {
      return {
        success: false,
        error: ERROR_MESSAGES.NO_CONFIG,
        message: ERROR_MESSAGES.NO_CONFIG
      };
    }

    let remoteHistory: HistoryItem[] = [];
    try {
      remoteHistory = await syncFromCloud();
    } catch (e) {
      console.log("No remote history found or first sync");
    }

    const merged = await mergeHistory(localHistory, remoteHistory);

    let content: string;
    let contentType = "application/json";
    
    if (config.encryption && config.encryption.enabled && config.encryption.key) {
      content = await encrypt(merged, config.encryption.key, config.encryption.type);
      contentType = "application/octet-stream";
    } else {
      content = JSON.stringify(merged);
    }
    
    const response = await fetch(`${config.url.replace(/\/$/, "")}/${WEBDAV_FILENAME}`, {
      method: "PUT",
      headers: {
        "Authorization": `Basic ${btoa(`${config.username}:${config.password || ''}`)}`,
        "Content-Type": contentType
      },
      body: content
    });

    if (!response.ok) {
      let errorMessage = ERROR_MESSAGES.SYNC_FAILED;
      
      switch (response.status) {
        case 401:
          errorMessage = ERROR_MESSAGES.INVALID_CREDENTIALS;
          break;
        case 404:
          errorMessage = "WebDAV 服务器路径不存在";
          break;
        case 403:
          errorMessage = "没有权限访问 WebDAV 服务器";
          break;
        case 500:
          errorMessage = "WebDAV 服务器内部错误";
          break;
        case 0:
          errorMessage = "无法连接到 WebDAV 服务器，请检查网络连接";
          break;
      }
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
    
    return {
      success: true,
      items: merged,
      message: "同步到云端成功！已合并数据。"
    };
  } catch (error: any) {
    console.error("Sync to cloud failed:", error);
    return {
      success: false,
      error: error.message || ERROR_MESSAGES.SYNC_FAILED,
      message: ERROR_MESSAGES.SYNC_FAILED
    };
  }
}

export async function syncFromCloud(): Promise<HistoryItem[]> {
  try {
    const config = await getConfig();
    
    if (!config || !validateConfig(config)) {
      createError(ERROR_MESSAGES.NO_CONFIG, "config");
    }

    const response = await fetch(`${config.url.replace(/\/$/, "")}/${WEBDAV_FILENAME}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${btoa(`${config.username}:${config.password || ''}`)}`
      }
    });

    if (response.status === 404) return [];
    
    if (!response.ok) {
      let errorMessage = ERROR_MESSAGES.SYNC_FAILED;
      
      switch (response.status) {
        case 401:
          errorMessage = ERROR_MESSAGES.INVALID_CREDENTIALS;
          break;
        case 404:
          errorMessage = "WebDAV 服务器路径不存在";
          break;
        case 403:
          errorMessage = "没有权限访问 WebDAV 服务器";
          break;
        case 500:
          errorMessage = "WebDAV 服务器内部错误";
          break;
        case 0:
          errorMessage = "无法连接到 WebDAV 服务器，请检查网络连接";
          break;
      }
      
      createError(errorMessage, "network");
    }

    let data: any;
    
    if (config.encryption && config.encryption.enabled && config.encryption.key) {
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const encryptedData = btoa(String.fromCharCode(...uint8Array));
      data = await decrypt(encryptedData, config.encryption.key, config.encryption.type);
    } else {
      data = await response.json();
    }
    
    if (!Array.isArray(data)) {
      createError("云端数据格式错误", "validation");
    }
    
    return data;
  } catch (error: any) {
    console.error("Sync from cloud failed:", error);
    throw error;
  }
}
