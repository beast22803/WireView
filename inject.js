// inject.js
// Monkey-patch fetch, XHR, WebSocket to capture API calls

(function () {
  if (window.__uam_injected) return;
  window.__uam_injected = true;

  function generateId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // Utility to clone headers into plain object
  function headersToObject(headers) {
    const obj = {};
    if (!headers) return obj;
    if (headers.forEach) {
      headers.forEach((value, key) => {
        obj[key] = value;
      });
    } else if (typeof headers === "object") {
      for (const key in headers) {
        obj[key.toLowerCase()] = headers[key];
      }
    }
    return obj;
  }

  // Patch fetch
  const originalFetch = window.fetch;
  window.fetch = function (input, init = {}) {
    const id = generateId();
    const startedAt = Date.now();

    let url = typeof input === "string" ? input : input.url;
    let method = (
      init.method ||
      (typeof input === "object" && input.method) ||
      "GET"
    ).toUpperCase();
    let requestHeaders = headersToObject(
      init.headers || (typeof input === "object" && input.headers)
    );
    let requestBody = init.body || null;

    return originalFetch(input, init)
      .then(async (response) => {
        const clone = response.clone();

        // Try to get response body as text (with size limit)
        let responseBody = null;
        try {
          const text = await clone.text();
          // Limit response body size to prevent memory issues
          responseBody =
            text.length > 50000
              ? text.slice(0, 50000) + "\n... (truncated)"
              : text;
        } catch (error) {
          responseBody = `Error reading response: ${error.message}`;
        }

        const entry = {
          id,
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          startedAt,
          duration: Date.now() - startedAt,
          requestHeaders,
          requestBody:
            typeof requestBody === "string" && requestBody.length > 10000
              ? requestBody.slice(0, 10000) + "\n... (truncated)"
              : requestBody,
          responseHeaders: headersToObject(response.headers),
          responseBody,
        };

        window.postMessage({ type: "uam-api-call", entry }, "*");
        return response;
      })
      .catch((error) => {
        // Handle fetch errors
        const entry = {
          id,
          url,
          method,
          status: 0,
          statusText: "Network Error",
          startedAt,
          duration: Date.now() - startedAt,
          requestHeaders,
          requestBody:
            typeof requestBody === "string" && requestBody.length > 10000
              ? requestBody.slice(0, 10000) + "\n... (truncated)"
              : requestBody,
          responseHeaders: {},
          responseBody: `Fetch error: ${error.message}`,
          error: error.message,
        };

        window.postMessage({ type: "uam-api-call", entry }, "*");
        throw error; // Re-throw to maintain original behavior
      });
  };

  // Patch XHR
  const originalXHR = XMLHttpRequest;
  function UAM_XHR() {
    const xhr = new originalXHR();
    const id = generateId();
    let requestHeaders = {};
    let requestBody = null;
    let method = "";
    let url = "";
    let startedAt = 0;

    xhr.open = function (...args) {
      method = args[0].toUpperCase();
      url = args[1];
      startedAt = Date.now();
      return originalXHR.prototype.open.apply(xhr, args);
    };

    const originalSetRequestHeader = xhr.setRequestHeader;
    xhr.setRequestHeader = function (name, value) {
      requestHeaders[name.toLowerCase()] = value;
      return originalSetRequestHeader.apply(xhr, arguments);
    };

    const originalSend = xhr.send;
    xhr.send = function (body) {
      requestBody = body;
      originalSend.apply(xhr, arguments);
    };

    xhr.addEventListener("loadend", function () {
      try {
        const responseHeaders = xhr.getAllResponseHeaders();
        // Parse response headers string into object
        const rhObj = {};
        if (responseHeaders) {
          responseHeaders
            .trim()
            .split(/[\r\n]+/)
            .forEach((line) => {
              if (line.includes(": ")) {
                const parts = line.split(": ");
                const header = parts.shift();
                const value = parts.join(": ");
                if (header) {
                  rhObj[header.toLowerCase()] = value;
                }
              }
            });
        }

        // Limit response body size
        let responseBody = xhr.responseText || "";
        if (responseBody.length > 50000) {
          responseBody = responseBody.slice(0, 50000) + "\n... (truncated)";
        }

        // Limit request body size
        let limitedRequestBody = requestBody;
        if (typeof requestBody === "string" && requestBody.length > 10000) {
          limitedRequestBody =
            requestBody.slice(0, 10000) + "\n... (truncated)";
        }

        const entry = {
          id,
          url,
          method,
          status: xhr.status || 0,
          statusText:
            xhr.statusText || (xhr.status === 0 ? "Network Error" : ""),
          startedAt,
          duration: Date.now() - startedAt,
          requestHeaders,
          requestBody: limitedRequestBody,
          responseHeaders: rhObj,
          responseBody,
        };
        window.postMessage({ type: "uam-api-call", entry }, "*");
      } catch (error) {
        // Fallback entry for errors
        const entry = {
          id,
          url,
          method,
          status: 0,
          statusText: "Error",
          startedAt,
          duration: Date.now() - startedAt,
          requestHeaders,
          requestBody,
          responseHeaders: {},
          responseBody: `XHR error: ${error.message}`,
          error: error.message,
        };
        window.postMessage({ type: "uam-api-call", entry }, "*");
      }
    });

    return xhr;
  }
  window.XMLHttpRequest = UAM_XHR;

  // Patch WebSocket
  const OriginalWebSocket = window.WebSocket;
  function UAM_WebSocket(url, protocols) {
    const ws = protocols
      ? new OriginalWebSocket(url, protocols)
      : new OriginalWebSocket(url);
    const id = generateId();
    let hasInitialLog = false;

    const entry = {
      id,
      url,
      method: "WEBSOCKET",
      status: 0,
      statusText: "Connecting",
      startedAt: Date.now(),
      duration: 0,
      requestHeaders: {},
      requestBody: null,
      responseHeaders: {},
      responseBody: null,
      messages: [],
    };

    // Send initial WebSocket connection log
    function sendInitialLog() {
      if (!hasInitialLog) {
        hasInitialLog = true;
        window.postMessage({ type: "uam-api-call", entry: { ...entry } }, "*");
      }
    }

    // Send updated log with new message
    function sendUpdatedLog() {
      const updatedEntry = { ...entry, messages: [...entry.messages] };
      window.postMessage({ type: "uam-api-call", entry: updatedEntry }, "*");
    }

    ws.addEventListener("open", () => {
      entry.status = 101;
      entry.statusText = "Connected";
      sendInitialLog();
    });

    ws.addEventListener("message", (event) => {
      entry.messages.push({
        type: "received",
        data: event.data,
        timestamp: Date.now(),
      });
      sendUpdatedLog();
    });

    ws.addEventListener("error", () => {
      entry.status = 0;
      entry.statusText = "Error";
      sendUpdatedLog();
    });

    ws.addEventListener("close", (event) => {
      entry.status = event.code || 1000;
      entry.statusText = `Closed (${event.code || 1000})`;
      entry.duration = Date.now() - entry.startedAt;
      sendUpdatedLog();
    });

    const originalSend = ws.send;
    ws.send = function (data) {
      entry.messages.push({
        type: "sent",
        data: data,
        timestamp: Date.now(),
      });
      sendUpdatedLog();
      return originalSend.call(this, data);
    };

    // Send initial log for immediate connection
    setTimeout(sendInitialLog, 0);

    return ws;
  }
  window.WebSocket = UAM_WebSocket;
})();
