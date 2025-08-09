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
  // Add Google Material Icons font
  if (!document.querySelector('link[href*="material-icons"]')) {
    const iconLink = document.createElement("link");
    iconLink.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
    iconLink.rel = "stylesheet";
    document.head.appendChild(iconLink);
  }

  const overlay = document.createElement("div");
  overlay.id = "uam-overlay";
  overlay.innerHTML = `
    <!-- Minimized floating button -->
    <div class="uam-minimized" id="uam-minimized">
      <div class="uam-mini-icon">
        <span class="material-icons">network_check</span>
      </div>
      <div class="uam-mini-badge" id="uam-mini-badge">0</div>
    </div>
    
    <!-- Full overlay panel -->
    <div class="uam-panel" id="uam-panel">
      <div class="uam-header">
        <div class="uam-title-section">
          <span class="material-icons uam-main-icon">monitor_heart</span>
          <span class="uam-title">API Monitor</span>
          <div class="uam-stats">
            <span class="uam-count" id="uam-count">0 requests</span>
          </div>
        </div>
        <div class="uam-controls">
          <button id="uam-toggle" title="Toggle View" class="uam-btn">
            <span class="material-icons">visibility</span>
          </button>
          <button id="uam-clear" title="Clear All" class="uam-btn">
            <span class="material-icons">clear_all</span>
          </button>
          <button id="uam-export" title="Export Data" class="uam-btn">
            <span class="material-icons">download</span>
          </button>
          <button id="uam-minimize" title="Minimize" class="uam-btn">
            <span class="material-icons">minimize</span>
          </button>
          <button id="uam-close" title="Close" class="uam-btn uam-btn-danger">
            <span class="material-icons">close</span>
          </button>
        </div>
      </div>
      <div class="uam-content" id="uam-content">
        <div class="uam-filters">
          <div class="uam-filter-group">
            <label class="uam-filter-label">
              <span class="material-icons">filter_list</span>
              Filter by method:
            </label>
            <select id="uam-method-filter" class="uam-select">
              <option value="">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
              <option value="WEBSOCKET">WebSocket</option>
            </select>
          </div>
          <div class="uam-filter-group">
            <label class="uam-filter-label">
              <span class="material-icons">search</span>
              Search URL:
            </label>
            <input type="text" id="uam-url-filter" class="uam-input" placeholder="Filter by URL...">
          </div>
        </div>
        <table id="uam-table">
          <thead>
            <tr>
              <th><span class="material-icons">schedule</span> Time</th>
              <th><span class="material-icons">http</span> Method</th>
              <th><span class="material-icons">link</span> URL</th>
              <th><span class="material-icons">info</span> Status</th>
              <th><span class="material-icons">timer</span> Duration</th>
              <th><span class="material-icons">more_vert</span></th>
            </tr>
          </thead>
          <tbody id="uam-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  // Add overlay styles
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
    
    #uam-overlay {
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      z-index: 999999 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 13px !important;
      pointer-events: none !important; /* Allow clicks through the overlay container */
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      background: none !important;
      width: auto !important;
      height: auto !important;
      max-width: none !important;
      max-height: none !important;
      min-width: 0 !important;
      min-height: 0 !important;
      transform: none !important;
      opacity: 1 !important;
      visibility: visible !important;
      display: block !important;
      overflow: visible !important;
      box-sizing: border-box !important;
    }
    
    #uam-overlay * {
      pointer-events: auto !important; /* Re-enable pointer events for child elements */
      box-sizing: border-box !important;
    }

    /* Minimized floating button */
    .uam-minimized {
      position: relative;
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: scale(1);
      animation: pulse 2s infinite;
    }

    .uam-minimized:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
    }

    .uam-mini-icon .material-icons {
      color: white;
      font-size: 24px;
    }

    .uam-mini-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ff4757;
      color: white;
      border-radius: 12px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 600;
      min-width: 18px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(255, 71, 87, 0.4);
      transform: scale(0);
      transition: transform 0.2s ease;
    }

    .uam-mini-badge.has-count {
      transform: scale(1);
    }

    @keyframes pulse {
      0% { box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4); }
      50% { box-shadow: 0 4px 20px rgba(102, 126, 234, 0.6), 0 0 0 10px rgba(102, 126, 234, 0.1); }
      100% { box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4); }
    }

    /* Full panel */
    .uam-panel {
      width: 700px;
      max-height: 500px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      overflow: hidden;
      transform: scale(0) translateY(20px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: bottom right;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
    }

    .uam-panel.show {
      transform: scale(1) translateY(0);
      opacity: 1;
    }

    .uam-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      cursor: move;
    }

    .uam-title-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .uam-main-icon {
      font-size: 24px !important;
      color: rgba(255,255,255,0.9);
    }

    .uam-title {
      font-weight: 600;
      font-size: 16px;
      color: white;
    }

    .uam-stats {
      display: flex;
      flex-direction: column;
    }

    .uam-count {
      font-size: 11px;
      color: rgba(255,255,255,0.8);
      font-weight: 500;
    }

    .uam-controls {
      display: flex;
      gap: 4px;
    }

    .uam-btn {
      background: rgba(255,255,255,0.1);
      border: none;
      padding: 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .uam-btn:hover {
      background: rgba(255,255,255,0.2);
      transform: translateY(-1px);
    }

    .uam-btn .material-icons {
      color: white;
      font-size: 18px !important;
    }

    .uam-btn-danger:hover {
      background: rgba(255, 71, 87, 0.3);
    }

    .uam-content {
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .uam-filters {
      padding: 16px 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      gap: 20px;
      align-items: center;
    }

    .uam-filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .uam-filter-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 500;
      color: #495057;
    }

    .uam-filter-label .material-icons {
      font-size: 16px !important;
      color: #6c757d;
    }

    .uam-select, .uam-input {
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 12px;
      background: white;
      transition: border-color 0.2s ease;
    }

    .uam-select:focus, .uam-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .uam-table-container {
      overflow-y: auto;
      max-height: 300px;
    }

    #uam-table {
      width: 100%;
      border-collapse: collapse;
    }

    #uam-table th {
      padding: 12px 16px;
      text-align: left;
      background: white;
      font-weight: 600;
      color: #495057;
      border-bottom: 2px solid #e9ecef;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    #uam-table th .material-icons {
      font-size: 16px !important;
      vertical-align: middle;
      margin-right: 4px;
      color: #6c757d;
    }

    #uam-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f3f4;
      vertical-align: middle;
    }

    #uam-table tbody tr {
      transition: all 0.2s ease;
      cursor: pointer;
    }

    #uam-table tbody tr:hover {
      background: linear-gradient(90deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
      transform: translateX(2px);
      box-shadow: inset 3px 0 0 #667eea;
    }

    /* Method colors with icons */
    .uam-method-GET { 
      color: #10ac84; 
      font-weight: 600;
      background: rgba(16, 172, 132, 0.1);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
    }
    .uam-method-POST { 
      color: #3742fa; 
      font-weight: 600;
      background: rgba(55, 66, 250, 0.1);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
    }
    .uam-method-PUT { 
      color: #ff9f43; 
      font-weight: 600;
      background: rgba(255, 159, 67, 0.1);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
    }
    .uam-method-DELETE { 
      color: #ff4757; 
      font-weight: 600;
      background: rgba(255, 71, 87, 0.1);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
    }
    .uam-method-PATCH { 
      color: #a55eea; 
      font-weight: 600;
      background: rgba(165, 94, 234, 0.1);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
    }
    .uam-method-WEBSOCKET { 
      color: #26de81; 
      font-weight: 600;
      background: rgba(38, 222, 129, 0.1);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
    }

    /* Status indicators */
    .uam-status-success { 
      color: #10ac84; 
      font-weight: 600;
    }
    .uam-status-error { 
      color: #ff4757; 
      font-weight: 600;
    }

    /* Action button in table */
    .uam-action-btn {
      background: none;
      border: none;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
      color: #6c757d;
      transition: all 0.2s ease;
    }

    .uam-action-btn:hover {
      background: #f8f9fa;
      color: #495057;
    }

    .uam-action-btn .material-icons {
      font-size: 18px !important;
    }

    .uam-hidden { 
      display: none !important; 
    }

    /* Scrollbar styling */
    .uam-table-container::-webkit-scrollbar {
      width: 6px;
    }

    .uam-table-container::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }

    .uam-table-container::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }

    .uam-table-container::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
  `;
  document.head.appendChild(style);

  // Ensure overlay doesn't affect page layout
  overlay.style.position = "fixed";
  overlay.style.zIndex = "999999";
  overlay.style.pointerEvents = "none";

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
let controlsAPI = null;

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

  // Update count after adding entries
  if (controlsAPI) {
    controlsAPI.updateCount();
  }
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

  const methodClass = `uam-method-${entry.method}`;
  const statusClass =
    entry.status >= 200 && entry.status < 400
      ? "uam-status-success"
      : "uam-status-error";

  tr.innerHTML = `
    <td>${new Date(entry.startedAt).toLocaleTimeString()}</td>
    <td><span class="${methodClass}">${escapeHtml(
    entry.method || "UNKNOWN"
  )}</span></td>
    <td title="${escapeHtml(entry.url || "")}">${escapeHtml(
    (entry.url || "").slice(0, 40)
  )}${(entry.url || "").length > 40 ? "…" : ""}</td>
    <td class="${statusClass}">${entry.status || "…"}</td>
    <td>${entry.duration ? entry.duration.toFixed(2) + "ms" : "…"}</td>
    <td>
      <button class="uam-action-btn" title="View Details">
        <span class="material-icons">visibility</span>
      </button>
    </td>
  `;

  // Add click handler to the action button
  const actionBtn = tr.querySelector(".uam-action-btn");
  actionBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showDetailModal(entry);
  });

  // Add row click handler
  tr.addEventListener("click", () => showDetailModal(entry));

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
  const minimizedBtn = document.getElementById("uam-minimized");
  const panel = document.getElementById("uam-panel");
  const toggleBtn = document.getElementById("uam-toggle");
  const clearBtn = document.getElementById("uam-clear");
  const exportBtn = document.getElementById("uam-export");
  const minimizeBtn = document.getElementById("uam-minimize");
  const closeBtn = document.getElementById("uam-close");
  const content = document.getElementById("uam-content");
  const countElement = document.getElementById("uam-count");
  const badgeElement = document.getElementById("uam-mini-badge");
  const methodFilter = document.getElementById("uam-method-filter");
  const urlFilter = document.getElementById("uam-url-filter");

  let isExpanded = false;
  let hoverTimeout;

  // Update count and badge
  function updateCount() {
    const count = logs.length;
    countElement.textContent = `${count} request${count !== 1 ? "s" : ""}`;
    badgeElement.textContent = count > 99 ? "99+" : count.toString();
    badgeElement.classList.toggle("has-count", count > 0);
  }

  // Show/hide panel with animation
  function showPanel() {
    isExpanded = true;
    panel.classList.add("show");
    minimizedBtn.style.display = "none";
  }

  function hidePanel() {
    isExpanded = false;
    panel.classList.remove("show");
    minimizedBtn.style.display = "flex";
  }

  // Hover functionality for minimized button
  minimizedBtn.onmouseenter = () => {
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(showPanel, 300); // 300ms delay before showing
  };

  minimizedBtn.onmouseleave = () => {
    clearTimeout(hoverTimeout);
  };

  // Panel hover handlers
  panel.onmouseenter = () => {
    clearTimeout(hoverTimeout);
  };

  panel.onmouseleave = () => {
    hoverTimeout = setTimeout(hidePanel, 1000); // 1s delay before hiding
  };

  // Click to toggle
  minimizedBtn.onclick = () => {
    clearTimeout(hoverTimeout);
    if (isExpanded) {
      hidePanel();
    } else {
      showPanel();
    }
  };

  // Control buttons
  toggleBtn.onclick = () => {
    isVisible = !isVisible;
    content.classList.toggle("uam-hidden", !isVisible);
    const icon = toggleBtn.querySelector(".material-icons");
    icon.textContent = isVisible ? "visibility" : "visibility_off";
  };

  clearBtn.onclick = () => {
    logs = [];
    tbody.innerHTML = "";
    updateCount();
    chrome.runtime.sendMessage({ type: "clear-logs", origin: location.origin });
  };

  exportBtn.onclick = () => {
    if (logs.length === 0) {
      alert("No requests to export");
      return;
    }
    const dataStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-logs-${location.hostname}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  minimizeBtn.onclick = () => {
    hidePanel();
  };

  closeBtn.onclick = () => {
    overlay.style.display = "none";
  };

  // Filter functionality
  function applyFilters() {
    const methodFilterValue = methodFilter.value.toLowerCase();
    const urlFilterValue = urlFilter.value.toLowerCase();

    const rows = tbody.querySelectorAll("tr");
    rows.forEach((row) => {
      const method = row.children[1].textContent.toLowerCase();
      const url = row.children[2].textContent.toLowerCase();

      const methodMatch =
        !methodFilterValue || method.includes(methodFilterValue);
      const urlMatch = !urlFilterValue || url.includes(urlFilterValue);

      row.style.display = methodMatch && urlMatch ? "" : "none";
    });
  }

  methodFilter.addEventListener("change", applyFilters);
  urlFilter.addEventListener("input", applyFilters);

  // Make header draggable
  const header = overlay.querySelector(".uam-header");
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  header.onmousedown = (e) => {
    if (e.target.tagName === "BUTTON" || e.target.tagName === "SPAN") return;
    isDragging = true;
    dragOffset.x = e.clientX - overlay.offsetLeft;
    dragOffset.y = e.clientY - overlay.offsetTop;
    clearTimeout(hoverTimeout); // Prevent hiding while dragging
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

  // Initialize
  updateCount();

  // Return update function for external use
  return { updateCount };
}

// Initialize when DOM is ready
function initialize() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
    return;
  }

  // Inject the monitoring script
  injectScript();

  // Wait a bit to ensure page is fully loaded
  setTimeout(() => {
    // Create overlay
    overlay = createOverlay();
    tbody = document.getElementById("uam-tbody");

    // Setup controls and get API reference
    controlsAPI = setupControls();

    // Wrap table in scrollable container
    const table = document.getElementById("uam-table");
    const tableContainer = document.createElement("div");
    tableContainer.className = "uam-table-container";
    table.parentNode.insertBefore(tableContainer, table);
    tableContainer.appendChild(table);
  }, 100); // Small delay to ensure page layout is stable
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
