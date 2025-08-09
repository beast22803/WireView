# API Lens – Universal API Monitor for Chrome

## 📌 Overview

**API Lens** is a Chrome extension that allows you to **monitor, log, and inspect all network requests** (Fetch, XHR, WebSocket) made by any website you visit.  
It works **independently of the technology** used on the site — React, Angular, Vue, plain HTML, or even custom JS frameworks — and captures:

- **Request details** – URL, method, headers, payload
- **Response details** – status code, headers, body
- **Timing info** – start time, end time, duration
- **Click-to-view full details** – inspect any request
- **Export logs** – save as JSON or CSV for analysis

---

## 🚀 Features

- **Universal Monitoring** – Works for any website without special setup.
- **Supports All Requests** – Fetch API, XMLHttpRequest, and WebSockets.
- **Detailed Inspection** – Click a request to see full headers, body, and response.
- **Live Overlay Panel** – View API calls in real-time without opening DevTools.
- **Data Export** – Download the captured requests as JSON or CSV.
- **Lightweight** – Minimal performance impact.

---

## 🛠 Technologies Used

- **JavaScript (ES6)** – Core scripting logic
- **HTML/CSS** – Popup, overlay, and settings UI
- **Chrome Extensions Manifest V3** – Extension framework
- **Message Passing API** – Communication between content and background scripts

---

## 📥 Installation (Developer Mode)

1. Download or clone this repository.
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the extension folder.
5. Navigate to any site and start capturing API calls.

---

## 📖 Usage

1. **Activate the Extension** – Click the extension icon in Chrome.
2. **View Live Logs** – See API calls appear in the floating overlay.
3. **Inspect Details** – Click a request for headers, payload, and response.
4. **Export Data** – Download logs as JSON or CSV from the popup.

---

## 🔮 Future Improvements

- Search & filter requests by keyword or status.
- Save session logs in Chrome storage.
- Request replay feature (like Postman).
- Dark mode for overlay.

---

## ⚖️ License

This project is licensed under the **MIT License** – free for personal and commercial use.
