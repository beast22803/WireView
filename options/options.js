// options.js
const captureBodiesCheckbox = document.getElementById("captureBodies");
const clearStorageBtn = document.getElementById("clearStorage");

const STORAGE_KEY_CAPTURE_BODIES = "captureBodies";

// Load option
chrome.storage.local.get([STORAGE_KEY_CAPTURE_BODIES], (result) => {
  captureBodiesCheckbox.checked = result[STORAGE_KEY_CAPTURE_BODIES] || false;
});

// Save option
captureBodiesCheckbox.addEventListener("change", () => {
  chrome.storage.local.set({
    [STORAGE_KEY_CAPTURE_BODIES]: captureBodiesCheckbox.checked,
  });
});

// Clear all logs button
clearStorageBtn.addEventListener("click", () => {
  chrome.storage.local.clear(() => {
    alert("All stored logs cleared.");
  });
});
