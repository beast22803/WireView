// content.js
// Handles overlay UI and communication between injected script and background

// Inject the API monitoring script
function injectScript() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Create overlay UI with better styling and functionality
function createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "uam-overlay";
  overlay.innerHTML = `
    <div class="uam-header">
      <span class="uam-title">API Monitor</span>
      <div class="uam-controls">
        <button id="uam-toggle" title="Show/Hide">👁</button>
        <button id="uam-clear" title="Clear">🗑</button>
        <button id="uam-export" title="Export">💾</button>
        <button id="uam-close" title="Close">✕</button>
      </div>
    </div>
    <div class="uam-content" id="uam-content">
      <table id="uam-table">
        <thead>
          <tr>
            <th>Time</th><th>Method</th><th>URL</th><th>Status</th><th>Duration(ms)</th>
          </tr>
        </thead>
        <tbody id="uam-tbody"></tbody>
      </table>
    </div>
  `;

  // Add overlay styles
  const style = document.createElement("style");
  style.textContent = `
    #uam-overlay {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 600px;
      max-height: 400px;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 999999;
      resize: both;
      overflow: hidden;
    }
    .uam-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      cursor: move;
    }
    .uam-title {
      font-weight: 600;
      color: #495057;
    }
    .uam-controls button {
      background: none;
      border: none;
      padding: 4px 8px;
      margin-left: 4px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .uam-controls button:hover {
      background: #e9ecef;
    }
    .uam-content {
      overflow-y: auto;
      max-height: 350px;
    }
    #uam-table {
      width: 100%;
      border-collapse: collapse;
    }
    #uam-table th, #uam-table td {
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
    }
    #uam-table th {
      background: #f8f9fa;
      font-weight: 600;
      position: sticky;
      top: 0;
    }
    #uam-table tbody tr:hover {
      background: #f8f9fa;
      cursor: pointer;
    }
    .uam-method-GET { color: #28a745; }
    .uam-method-POST { color: #007bff; }
    .uam-method-PUT { color: #ffc107; }
    .uam-method-DELETE { color: #dc3545; }
    .uam-status-success { color: #28a745; }
    .uam-status-error { color: #dc3545; }
    .uam-hidden { display: none; }
  `;
  document.head.appendChild(style);

  document.body.appendChild(overlay);
  return overlay;
}

// Initialize
let overlay = null;
let tbody = null;
let logs = [];
let isVisible = true;
let updateQueue = [];
let updateTimeout = null;

// Debounced UI update for performance
function queueUIUpdate(entry) {
  updateQueue.push(entry);
  if (updateTimeout) clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    flushUIUpdates();
    updateTimeout = null;
  }, 100); // 100ms debounce
}

function flushUIUpdates() {
  if (!tbody || updateQueue.length === 0) return;

  const fragment = document.createDocumentFragment();
  updateQueue.forEach((entry) => {
    const row = createRow(entry);
    fragment.appendChild(row);
  });

  tbody.insertBefore(fragment, tbody.firstChild);

  // Limit visible rows for performance
  while (tbody.children.length > 1000) {
    tbody.removeChild(tbody.lastChild);
  }

  updateQueue = [];
}

// Escape HTML helper
function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/[&<>"']/g, (m) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m];
  });
}

// Create a row for an entry
function createRow(entry) {
  const tr = document.createElement("tr");
  tr.setAttribute("data-id", entry.id);
  tr.addEventListener("click", () => showDetailModal(entry));

  const methodClass = `uam-method-${entry.method}`;
  const statusClass =
    entry.status >= 200 && entry.status < 400
      ? "uam-status-success"
      : "uam-status-error";

  tr.innerHTML = `
    <td>${new Date(entry.startedAt).toLocaleTimeString()}</td>
    <td class="${methodClass}">${escapeHtml(entry.method || "UNKNOWN")}</td>
    <td title="${escapeHtml(entry.url || "")}">${escapeHtml(
    (entry.url || "").slice(0, 50)
  )}${(entry.url || "").length > 50 ? "…" : ""}</td>
    <td class="${statusClass}">${entry.status || "…"}</td>
    <td>${entry.duration ? entry.duration.toFixed(2) : "…"}</td>
  `;
  return tr;
}

// Show detailed modal for API call
function showDetailModal(entry) {
  const modal = document.createElement("div");
  modal.className = "uam-modal";
  modal.innerHTML = `
    <div class="uam-modal-content">
      <div class="uam-modal-header">
        <h3>API Call Details</h3>
        <button class="uam-modal-close">✕</button>
      </div>
      <div class="uam-modal-body">
        <div class="uam-detail-section">
          <h4>General</h4>
          <p><strong>URL:</strong> ${escapeHtml(entry.url || "")}</p>
          <p><strong>Method:</strong> ${escapeHtml(entry.method || "")}</p>
          <p><strong>Status:</strong> ${entry.status || "N/A"} ${escapeHtml(
    entry.statusText || ""
  )}</p>
          <p><strong>Duration:</strong> ${
            entry.duration ? entry.duration.toFixed(2) + "ms" : "N/A"
          }</p>
          <p><strong>Started:</strong> ${new Date(
            entry.startedAt
          ).toLocaleString()}</p>
        </div>
        
        <div class="uam-detail-section">
          <h4>Request Headers</h4>
          <pre>${JSON.stringify(entry.requestHeaders || {}, null, 2)}</pre>
        </div>
        
        <div class="uam-detail-section">
          <h4>Request Body</h4>
          <pre>${escapeHtml(entry.requestBody || "No body")}</pre>
        </div>
        
        <div class="uam-detail-section">
          <h4>Response Headers</h4>
          <pre>${JSON.stringify(entry.responseHeaders || {}, null, 2)}</pre>
        </div>
        
        <div class="uam-detail-section">
          <h4>Response Body</h4>
          <pre>${escapeHtml((entry.responseBody || "No body").slice(0, 5000))}${
    (entry.responseBody || "").length > 5000 ? "\n... (truncated)" : ""
  }</pre>
        </div>
        
        ${
          entry.messages
            ? `
          <div class="uam-detail-section">
            <h4>WebSocket Messages</h4>
            <div class="uam-ws-messages">
              ${entry.messages
                .map(
                  (msg) => `
                <div class="uam-ws-message ${msg.type}">
                  <span class="uam-ws-type">[${msg.type.toUpperCase()}]</span>
                  <span class="uam-ws-time">${new Date(
                    msg.timestamp
                  ).toLocaleTimeString()}</span>
                  <pre>${escapeHtml(JSON.stringify(msg.data, null, 2))}</pre>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;

  // Add modal styles
  const modalStyle = document.createElement("style");
  modalStyle.textContent = `
    .uam-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .uam-modal-content {
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 800px;
      max-height: 90%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .uam-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e9ecef;
      background: #f8f9fa;
    }
    .uam-modal-header h3 {
      margin: 0;
      font-size: 18px;
    }
    .uam-modal-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
    }
    .uam-modal-body {
      padding: 20px;
      overflow-y: auto;
    }
    .uam-detail-section {
      margin-bottom: 24px;
    }
    .uam-detail-section h4 {
      margin: 0 0 12px 0;
      color: #495057;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 4px;
    }
    .uam-detail-section pre {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 11px;
      margin: 8px 0;
    }
    .uam-ws-message {
      margin: 8px 0;
      padding: 8px;
      border-left: 3px solid #007bff;
      background: #f8f9fa;
    }
    .uam-ws-message.sent {
      border-left-color: #28a745;
    }
    .uam-ws-message.received {
      border-left-color: #ffc107;
    }
    .uam-ws-type {
      font-weight: bold;
      margin-right: 8px;
    }
    .uam-ws-time {
      color: #6c757d;
      font-size: 10px;
    }
  `;
  document.head.appendChild(modalStyle);

  document.body.appendChild(modal);

  // Close modal handlers
  modal.querySelector(".uam-modal-close").onclick = () => {
    document.body.removeChild(modal);
    document.head.removeChild(modalStyle);
  };
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
      document.head.removeChild(modalStyle);
    }
  };
}

// Setup overlay controls
function setupControls() {
  const toggleBtn = document.getElementById("uam-toggle");
  const clearBtn = document.getElementById("uam-clear");
  const exportBtn = document.getElementById("uam-export");
  const closeBtn = document.getElementById("uam-close");
  const content = document.getElementById("uam-content");

  toggleBtn.onclick = () => {
    isVisible = !isVisible;
    content.classList.toggle("uam-hidden", !isVisible);
    toggleBtn.textContent = isVisible ? "👁" : "👁‍🗨";
  };

  clearBtn.onclick = () => {
    logs = [];
    tbody.innerHTML = "";
    chrome.runtime.sendMessage({ type: "clear-logs", origin: location.origin });
  };

  exportBtn.onclick = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-logs-${location.hostname}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  closeBtn.onclick = () => {
    overlay.style.display = "none";
  };

  // Make header draggable
  const header = overlay.querySelector(".uam-header");
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  header.onmousedown = (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    dragOffset.x = e.clientX - overlay.offsetLeft;
    dragOffset.y = e.clientY - overlay.offsetTop;
  };

  document.onmousemove = (e) => {
    if (!isDragging) return;
    overlay.style.left = e.clientX - dragOffset.x + "px";
    overlay.style.top = e.clientY - dragOffset.y + "px";
    overlay.style.right = "auto";
    overlay.style.bottom = "auto";
  };

  document.onmouseup = () => {
    isDragging = false;
  };
}

// Initialize when DOM is ready
function initialize() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
    return;
  }

  // Inject the monitoring script
  injectScript();

  // Create overlay
  overlay = createOverlay();
  tbody = document.getElementById("uam-tbody");
  setupControls();
}

// Listen for messages from injected script
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (msg.type === "uam-api-call") {
    const origin = location.origin;
    const entry = msg.entry;
    logs.unshift(entry);

    // Send to background to store
    chrome.runtime.sendMessage({ type: "log-api-call", origin, entry });

    // Queue UI update for performance
    queueUIUpdate(entry);
  }
});

// Start initialization
initialize();
