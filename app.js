// Put your deployed Google Apps Script Web App URL here.
const API_URL = "https://script.google.com/macros/s/AKfycbzLKsU6C_DUd6E8RhdaD1Qry9uJmNAvZHxWipUGD3jBW926MmCF8u94N_RTxex0OY8kcw/exec";

let scanner = null;
let scannerRunning = false;
let requestCounter = 0;

const scanTab = document.getElementById("scanTab");
const manualTab = document.getElementById("manualTab");
const scannerPanel = document.getElementById("scannerPanel");
const lookupForm = document.getElementById("lookupForm");
const stopScannerBtn = document.getElementById("stopScannerBtn");
const resultEl = document.getElementById("result");
const messageEl = document.getElementById("message");
const checkBtn = document.getElementById("checkBtn");
const wingEl = document.getElementById("wing");
const flatEl = document.getElementById("flat");

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.remove("hidden");
}
function hideMessage() { messageEl.classList.add("hidden"); }

function resetResult() {
  resultEl.classList.add("hidden");
  resultEl.classList.remove("authorized", "denied");
  resultEl.innerHTML = "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function renderResult(data) {
  resultEl.classList.remove("hidden", "authorized", "denied");

  if (!data.found) {
    resultEl.classList.add("denied");
    resultEl.innerHTML = `
      <h2>❌ Entry Not Authorized</h2>
      <p>Flat <strong>${escapeHtml(data.flat)}</strong> was not found in ${escapeHtml(data.wing)}.</p>`;
    return;
  }

  if (!data.authorized) {
    resultEl.classList.add("denied");
    resultEl.innerHTML = `
      <h2>❌ Entry Not Authorized</h2>
      <div class="data-row"><span>Wing</span><strong>${escapeHtml(data.wing)}</strong></div>
      <div class="data-row"><span>Flat</span><strong>${escapeHtml(data.flat)}</strong></div>
      <div class="data-row"><span>Allowed</span><strong>${Number(data.memberCount || 0)}</strong></div>
      <div class="data-row"><span>Already Entered</span><strong>${Number(data.enteredCount || 0)}</strong></div>
      <p style="margin-top:12px"><strong>${escapeHtml(data.reason || "Entry limit reached.")}</strong></p>`;
    return;
  }

  resultEl.classList.add("authorized");
  resultEl.innerHTML = `
    <h2>✅ Entry Authorized</h2>
    <div class="data-row"><span>Wing</span><strong>${escapeHtml(data.wing)}</strong></div>
    <div class="data-row"><span>Flat</span><strong>${escapeHtml(data.flat)}</strong></div>
    <div class="data-row"><span>Amount Paid</span><strong>₹${Number(data.amountPaid || 0).toLocaleString("en-IN")}</strong></div>
    <div class="data-row"><span>Allowed Members</span><strong>${Number(data.memberCount || 0)}</strong></div>
    <div class="data-row"><span>Already Entered</span><strong>${Number(data.enteredCount || 0)}</strong></div>
    <div class="data-row"><span>Remaining</span><strong>${Number(data.remaining || 0)}</strong></div>
    <div style="margin-top:12px">This entry has been recorded.</div>`;
}

// Google Apps Script returns JSONP. This avoids cross-origin browser restrictions.
function api(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (API_URL.includes("PASTE_YOUR")) {
      reject(new Error("Configure API_URL in app.js first."));
      return;
    }

    const callback = `apiCallback_${Date.now()}_${++requestCounter}`;
    const query = new URLSearchParams({ action, callback, ...params });
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Request timed out."));
    }, 15000);

    window[callback] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to connect to Google Apps Script."));
    };

    script.src = `${API_URL}?${query.toString()}`;
    document.body.appendChild(script);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callback];
      script.remove();
    }
  });
}

async function checkAndRecord(wing, flat) {
  hideMessage();
  resetResult();

  if (!wing || !flat) {
    showMessage("Please provide Wing and Flat Number.");
    return;
  }

  checkBtn.disabled = true;
  checkBtn.textContent = "Checking...";

  try {
    const data = await api("authorize", { wing, flat });
    if (data.error) throw new Error(data.error);
    renderResult(data);
  } catch (err) {
    showMessage(err.message || "Unable to connect.");
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = "Check Authorization";
  }
}

lookupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  checkAndRecord(wingEl.value.trim(), flatEl.value.trim());
});

function parseQr(value) {
  // Supported QR formats:
  // 1) A Wing|101
  // 2) A Wing,101
  // 3) {"wing":"A Wing","flat":"101"}
  // 4) A Wing-101
  try {
    const obj = JSON.parse(value);
    if (obj.wing && obj.flat) return { wing: String(obj.wing), flat: String(obj.flat) };
  } catch (_) {}

  const parts = value.split(/[|,]/).map(x => x.trim());
  if (parts.length >= 2 && parts[0] && parts[1]) return { wing: parts[0], flat: parts[1] };

  const dash = value.match(/^(.+?)\s*-\s*(\d+)$/);
  if (dash) return { wing: dash[1].trim(), flat: dash[2].trim() };

  return null;
}

async function onScanSuccess(decodedText) {
  const parsed = parseQr(decodedText);
  if (!parsed) {
    showMessage("QR found, but it does not contain a valid Wing and Flat number.");
    return;
  }

  if (scannerRunning) {
    await stopScanner();
  }

  wingEl.value = parsed.wing;
  flatEl.value = parsed.flat;
  await checkAndRecord(parsed.wing, parsed.flat);
}

async function startScanner() {
  hideMessage();
  if (scannerRunning) return;

  if (typeof Html5Qrcode === "undefined") {
    showMessage("QR scanner library is still loading. Please try again.");
    return;
  }

  scanner = new Html5Qrcode("reader");
  try {
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScanSuccess,
      () => {}
    );
    scannerRunning = true;
  } catch (err) {
    showMessage("Camera could not be started. Allow camera permission and use HTTPS.");
  }
}

async function stopScanner() {
  if (scanner && scannerRunning) {
    try { await scanner.stop(); } catch (_) {}
    try { scanner.clear(); } catch (_) {}
  }
  scannerRunning = false;
  scanner = null;
}

scanTab.addEventListener("click", async () => {
  scanTab.classList.add("active");
  manualTab.classList.remove("active");
  scannerPanel.classList.remove("hidden");
  lookupForm.classList.add("hidden");
  resetResult();
  await startScanner();
});

manualTab.addEventListener("click", async () => {
  manualTab.classList.add("active");
  scanTab.classList.remove("active");
  await stopScanner();
  scannerPanel.classList.add("hidden");
  lookupForm.classList.remove("hidden");
  resetResult();
});

stopScannerBtn.addEventListener("click", stopScanner);

window.addEventListener("load", () => {
  setTimeout(startScanner, 600);
});
