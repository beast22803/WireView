// storage.js
// Helpers for saving/loading logs from chrome.storage.local

function saveLogs(origin, logs) {
  const obj = {};
  obj[origin] = logs;
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, resolve);
  });
}

function loadLogs(origin) {
  return new Promise((resolve) => {
    chrome.storage.local.get(origin, (items) => {
      resolve(items[origin] || []);
    });
  });
}

function clearLogs(origin) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(origin, resolve);
  });
}
