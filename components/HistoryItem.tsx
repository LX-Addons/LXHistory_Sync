import React, { useState, useEffect } from "react";
import type { HistoryItem as HistoryItemType } from "~common/types";

interface HistoryItemProps {
  item: HistoryItemType;
  showUrls?: boolean;
  iconSource?: string;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ item, showUrls = false, iconSource = "byteance" }) => {
  const handleClick = () => {
    if (item.url) {
      window.open(item.url, "_blank");
    }
  };

  const extractDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      let domain = url;
      domain = domain.replace(/^https?:\/\//, '');
      domain = domain.split('/')[0];
      return domain || "";
    }
  };

  const getFaviconUrl = (url: string) => {
    const domain = extractDomain(url);
    if (!domain) return "";

    switch (iconSource) {
      case "byteance":
        return `https://f1.allesedv.com/${domain}/favicon.ico`;
      case "google":
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
      case "duckduckgo":
        return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
      default:
        return "";
    }
  };

  const getLetterIcon = (url: string) => {
    const domain = extractDomain(url);
    if (domain) {
      return domain.charAt(0).toUpperCase();
    }
    return "🌐";
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <button 
      className="history-item" 
      onClick={handleClick}
      type="button"
      aria-label={`打开 ${item.title || '无标题'}`}
    >
      {item.url && iconSource !== "none" && (
        <div className="history-item-icon-container">
          {iconSource === "letter" ? (
            <div className="history-item-icon">
              {getLetterIcon(item.url)}
            </div>
          ) : (
            <img 
              className="history-item-icon" 
              src={getFaviconUrl(item.url)} 
              alt="" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.className = 'history-item-icon';
                placeholder.textContent = '🌐';
                target.parentElement?.appendChild(placeholder);
              }}
            />
          )}
        </div>
      )}
      <div className="history-item-content">
        <div className="history-item-title">{item.title || "无标题"}</div>
        {showUrls && item.url && (
          <div className="history-item-url">{item.url}</div>
        )}
      </div>
      <div className="history-item-time">{formatTime(item.lastVisitTime)}</div>
    </button>
  );
};

export default HistoryItem;