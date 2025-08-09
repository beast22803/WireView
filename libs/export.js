// export.js
// Export logs as JSON, CSV, or HAR formats

function escapeCsvCell(cell) {
  if (cell === undefined || cell === null) return "";
  const cellStr =
    typeof cell === "object" ? JSON.stringify(cell) : String(cell);
  return `"${cellStr.replace(/"/g, '""')}"`;
}

function logsToCSV(logs) {
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
  const rows = logs.map((l) => cols.map((c) => escapeCsvCell(l[c])).join(","));
  return [header, ...rows].join("\n");
}

function logsToHAR(logs) {
  return {
    log: {
      version: "1.2",
      creator: { name: "Universal API Monitor", version: "1.0" },
      entries: logs.map((l) => ({
        startedDateTime: new Date(l.startedAt).toISOString(),
        time: l.duration || 0,
        request: {
          method: l.method || "",
          url: l.url || "",
          headers: l.requestHeaders || {},
          postData: l.requestBody || null,
        },
        response: {
          status: l.status || 0,
          statusText: l.statusText || "",
          headers: l.responseHeaders || {},
          content: { text: l.responseBody || "" },
        },
      })),
    },
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportLogsAsJSON(logs, filename = "uam-logs.json") {
  const blob = new Blob([JSON.stringify(logs, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, filename);
}

function exportLogsAsCSV(logs, filename = "uam-logs.csv") {
  const csv = logsToCSV(logs);
  const blob = new Blob([csv], { type: "text/csv" });
  downloadBlob(blob, filename);
}

function exportLogsAsHAR(logs, filename = "uam-logs.har") {
  const har = logsToHAR(logs);
  const blob = new Blob([JSON.stringify(har, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, filename);
}
