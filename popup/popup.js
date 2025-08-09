// popup.js
// Display logs and provide clear/export in popup

const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");
const originFilter = document.getElementById("originFilter");
const logBody = document.getElementById("logBody");

let currentOrigin = null;
let logs = [];

async function fetchOrigins() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      resolve(Object.keys(items));
    });
  });
}

async function fetchLogs(origin) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "get-logs", origin }, (response) => {
      if (response && response.ok) {
        resolve(response.data);
      } else {
        resolve([]);
      }
    });
  });
}

function renderLogs() {
  logBody.innerHTML = "";
  logs.forEach((entry) => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.setAttribute("data-id", entry.id);

    const methodClass = `method-${entry.method?.toLowerCase()}`;
    const statusClass =
      entry.status >= 200 && entry.status < 400
        ? "status-success"
        : "status-error";

    tr.innerHTML = `
      <td>${new Date(entry.startedAt).toLocaleTimeString()}</td>
      <td class="${methodClass}">${entry.method || "UNKNOWN"}</td>
      <td title="${entry.url || ""}">${
      (entry.url || "").length > 30
        ? (entry.url || "").slice(0, 30) + "…"
        : entry.url || ""
    }</td>
      <td class="${statusClass}">${entry.status || "…"}</td>
      <td>${entry.duration ? entry.duration.toFixed(2) : "…"}</td>
    `;

    // Add click handler for detail view
    tr.addEventListener("click", () => showDetailModal(entry));
    tr.addEventListener(
      "mouseenter",
      () => (tr.style.backgroundColor = "#f8f9fa")
    );
    tr.addEventListener("mouseleave", () => (tr.style.backgroundColor = ""));

    logBody.appendChild(tr);
  });
}

async function loadOrigins() {
  const origins = await fetchOrigins();
  originFilter.innerHTML = "";
  origins.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    originFilter.appendChild(opt);
  });
  if (origins.length > 0) {
    currentOrigin = origins[0];
    originFilter.value = currentOrigin;
    logs = await fetchLogs(currentOrigin);
    renderLogs();
  }
}

clearBtn.addEventListener("click", async () => {
  if (!currentOrigin) return;
  await new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "clear-logs", origin: currentOrigin },
      () => resolve()
    );
  });
  logs = [];
  renderLogs();
});

exportBtn.addEventListener("click", () => {
  if (!logs.length) {
    alert("No logs to export");
    return;
  }

  // Create export options modal
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 20px; border-radius: 8px; min-width: 250px;">
      <h3 style="margin: 0 0 15px 0;">Export Format</h3>
      <button id="exportJSON" style="display: block; width: 100%; margin: 5px 0; padding: 8px;">JSON</button>
      <button id="exportCSV" style="display: block; width: 100%; margin: 5px 0; padding: 8px;">CSV</button>
      <button id="exportHAR" style="display: block; width: 100%; margin: 5px 0; padding: 8px;">HAR</button>
      <button id="cancelExport" style="display: block; width: 100%; margin: 10px 0 0 0; padding: 8px; background: #f8f9fa;">Cancel</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Export functions
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAsJSON() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: "application/json",
    });
    downloadBlob(
      blob,
      `api-logs-${currentOrigin.replace(
        /[^a-zA-Z0-9]/g,
        "-"
      )}-${Date.now()}.json`
    );
  }

  function exportAsCSV() {
    const cols = [
      "startedAt",
      "method",
      "url",
      "status",
      "duration",
      "requestHeaders",
      "requestBody",
      "responseHeaders",
      "responseBody",
    ];
    const header = cols.join(",");
    const rows = logs.map((log) =>
      cols
        .map((col) => {
          let cell = log[col];
          if (cell === undefined || cell === null) return '""';
          if (typeof cell === "object") cell = JSON.stringify(cell);
          return `"${String(cell).replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    downloadBlob(
      blob,
      `api-logs-${currentOrigin.replace(
        /[^a-zA-Z0-9]/g,
        "-"
      )}-${Date.now()}.csv`
    );
  }

  function exportAsHAR() {
    const har = {
      log: {
        version: "1.2",
        creator: { name: "API Monitor Extension", version: "1.0" },
        entries: logs.map((log) => ({
          startedDateTime: new Date(log.startedAt).toISOString(),
          time: log.duration || 0,
          request: {
            method: log.method || "",
            url: log.url || "",
            headers: Object.entries(log.requestHeaders || {}).map(
              ([name, value]) => ({ name, value })
            ),
            postData: log.requestBody ? { text: log.requestBody } : undefined,
          },
          response: {
            status: log.status || 0,
            statusText: log.statusText || "",
            headers: Object.entries(log.responseHeaders || {}).map(
              ([name, value]) => ({ name, value })
            ),
            content: { text: log.responseBody || "" },
          },
        })),
      },
    };
    const blob = new Blob([JSON.stringify(har, null, 2)], {
      type: "application/json",
    });
    downloadBlob(
      blob,
      `api-logs-${currentOrigin.replace(
        /[^a-zA-Z0-9]/g,
        "-"
      )}-${Date.now()}.har`
    );
  }

  // Event listeners
  modal.querySelector("#exportJSON").onclick = () => {
    exportAsJSON();
    document.body.removeChild(modal);
  };

  modal.querySelector("#exportCSV").onclick = () => {
    exportAsCSV();
    document.body.removeChild(modal);
  };

  modal.querySelector("#exportHAR").onclick = () => {
    exportAsHAR();
    document.body.removeChild(modal);
  };

  modal.querySelector("#cancelExport").onclick = () => {
    document.body.removeChild(modal);
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
});

originFilter.addEventListener("change", async () => {
  currentOrigin = originFilter.value;
  logs = await fetchLogs(currentOrigin);
  renderLogs();
});

// Show detailed modal for API call
function showDetailModal(entry) {
  const modal = document.createElement("div");
  modal.className = "detail-modal";
  modal.innerHTML = `
    <div class="detail-modal-content">
      <div class="detail-modal-header">
        <h3>API Call Details</h3>
        <button class="detail-modal-close">✕</button>
      </div>
      <div class="detail-modal-body">
        <div class="detail-section">
          <h4>General</h4>
          <p><strong>URL:</strong> ${entry.url || "N/A"}</p>
          <p><strong>Method:</strong> ${entry.method || "N/A"}</p>
          <p><strong>Status:</strong> ${entry.status || "N/A"} ${
    entry.statusText || ""
  }</p>
          <p><strong>Duration:</strong> ${
            entry.duration ? entry.duration.toFixed(2) + "ms" : "N/A"
          }</p>
          <p><strong>Started:</strong> ${new Date(
            entry.startedAt
          ).toLocaleString()}</p>
        </div>
        
        <div class="detail-section">
          <h4>Request Headers</h4>
          <pre>${JSON.stringify(entry.requestHeaders || {}, null, 2)}</pre>
        </div>
        
        <div class="detail-section">
          <h4>Request Body</h4>
          <pre>${entry.requestBody || "No body"}</pre>
        </div>
        
        <div class="detail-section">
          <h4>Response Headers</h4>
          <pre>${JSON.stringify(entry.responseHeaders || {}, null, 2)}</pre>
        </div>
        
        <div class="detail-section">
          <h4>Response Body</h4>
          <pre>${(entry.responseBody || "No body").slice(0, 2000)}${
    (entry.responseBody || "").length > 2000 ? "\n... (truncated)" : ""
  }</pre>
        </div>
        
        ${
          entry.messages
            ? `
          <div class="detail-section">
            <h4>WebSocket Messages</h4>
            <div class="ws-messages">
              ${entry.messages
                .map(
                  (msg) => `
                <div class="ws-message ${msg.type}">
                  <span class="ws-type">[${msg.type.toUpperCase()}]</span>
                  <span class="ws-time">${new Date(
                    msg.timestamp
                  ).toLocaleTimeString()}</span>
                  <pre>${JSON.stringify(msg.data, null, 2)}</pre>
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

  document.body.appendChild(modal);

  // Close modal handlers
  modal.querySelector(".detail-modal-close").onclick = () => {
    document.body.removeChild(modal);
  };
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
}

loadOrigins();
