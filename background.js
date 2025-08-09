// background.js
// Manages logs, handles messages, persists data

const MAX_LOGS_PER_ORIGIN = 2000;
const logsByOrigin = {};
const pendingSaves = new Map();
const SAVE_DEBOUNCE_MS = 500;

// Load logs on startup
chrome.storage.local.get(null, (items) => {
  Object.assign(logsByOrigin, items);
});

// Debounced save logs helper for performance
function persistLogs(origin) {
  if (!logsByOrigin[origin]) return;

  // Clear existing timeout for this origin
  if (pendingSaves.has(origin)) {
    clearTimeout(pendingSaves.get(origin));
  }

  // Set new debounced save
  const timeoutId = setTimeout(() => {
    // Keep max logs per origin
    if (logsByOrigin[origin].length > MAX_LOGS_PER_ORIGIN) {
      logsByOrigin[origin] = logsByOrigin[origin].slice(0, MAX_LOGS_PER_ORIGIN);
    }

    const toSave = {};
    toSave[origin] = logsByOrigin[origin];
    chrome.storage.local.set(toSave);
    pendingSaves.delete(origin);
  }, SAVE_DEBOUNCE_MS);

  pendingSaves.set(origin, timeoutId);
}

// Memory management - clean up old logs periodically
function cleanupOldLogs() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const origin in logsByOrigin) {
    if (logsByOrigin[origin]) {
      logsByOrigin[origin] = logsByOrigin[origin].filter(
        (log) => now - log.startedAt < maxAge
      );

      // If no logs left, remove the origin entirely
      if (logsByOrigin[origin].length === 0) {
        delete logsByOrigin[origin];
        chrome.storage.local.remove(origin);
      }
    }
  }
}

// Run cleanup every hour
setInterval(cleanupOldLogs, 60 * 60 * 1000);

// Receive log from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    if (msg.type === "log-api-call") {
      const { origin, entry } = msg;
      if (!origin || !entry) {
        sendResponse({ ok: false, error: "Missing origin or entry" });
        return;
      }

      if (!logsByOrigin[origin]) logsByOrigin[origin] = [];

      // Check for duplicate entries (especially for WebSocket updates)
      const existingIndex = logsByOrigin[origin].findIndex(
        (log) => log.id === entry.id
      );
      if (existingIndex >= 0) {
        // Update existing entry
        logsByOrigin[origin][existingIndex] = entry;
      } else {
        // Add new entry at the beginning
        logsByOrigin[origin].unshift(entry);
      }

      persistLogs(origin);
      sendResponse({ ok: true });
    } else if (msg.type === "get-logs") {
      const origin = msg.origin;
      if (!origin) {
        sendResponse({ ok: false, error: "Missing origin" });
        return;
      }
      sendResponse({ ok: true, data: logsByOrigin[origin] || [] });
    } else if (msg.type === "clear-logs") {
      const origin = msg.origin;
      if (!origin) {
        sendResponse({ ok: false, error: "Missing origin" });
        return;
      }
      logsByOrigin[origin] = [];

      // Clear any pending saves and save immediately
      if (pendingSaves.has(origin)) {
        clearTimeout(pendingSaves.get(origin));
        pendingSaves.delete(origin);
      }

      chrome.storage.local.remove(origin);
      sendResponse({ ok: true });
    } else if (msg.type === "get-log-detail") {
      const id = msg.id;
      if (!id) {
        sendResponse({ ok: false, error: "Missing log ID" });
        return;
      }

      for (const origin in logsByOrigin) {
        const found = logsByOrigin[origin].find((l) => l.id === id);
        if (found) {
          sendResponse({ ok: true, data: found });
          return true;
        }
      }
      sendResponse({ ok: false, error: "Log not found" });
    } else if (msg.type === "get-all-origins") {
      sendResponse({ ok: true, data: Object.keys(logsByOrigin) });
    } else {
      sendResponse({ ok: false, error: "Unknown message type" });
    }
  } catch (error) {
    console.error("Background script error:", error);
    sendResponse({ ok: false, error: error.message });
  }

  return true; // keep message channel open for async
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log("API Monitor extension started");
});

// Handle extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log("API Monitor extension installed");
});
