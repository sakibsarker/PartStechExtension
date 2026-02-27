// ─── Types ────────────────────────────────────────────────────────────────────

interface StorageData {
  token?: string;
  apiBaseUrl?: string;
}

// ─── DOM Refs ─────────────────────────────────────────────────────────────────

const tokenInput = document.getElementById(
  "token-input",
) as HTMLTextAreaElement;
const apiUrlInput = document.getElementById(
  "api-url-input",
) as HTMLInputElement;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;
const statusMsg = document.getElementById("status-msg") as HTMLParagraphElement;
const tokenStatusEl = document.getElementById(
  "token-status",
) as HTMLSpanElement;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setStatus(message: string, type: "success" | "error" | "info"): void {
  statusMsg.textContent = message;
  statusMsg.className = `popup-status popup-status--${type}`;
  // Auto-clear after 4 s
  setTimeout(() => {
    statusMsg.textContent = "";
    statusMsg.className = "popup-status";
  }, 4000);
}

function updateTokenBadge(hasToken: boolean): void {
  if (hasToken) {
    tokenStatusEl.textContent = "✓ Token saved";
    tokenStatusEl.className = "token-status token-status--set";
  } else {
    tokenStatusEl.textContent = "No token saved";
    tokenStatusEl.className = "token-status token-status--none";
  }
}

function maskToken(token: string): string {
  if (token.length <= 20) return "*".repeat(token.length);
  return token.slice(0, 12) + "…" + token.slice(-8);
}

// ─── Load saved values on open ────────────────────────────────────────────────

async function loadStoredValues(): Promise<void> {
  const data = (await chrome.storage.local.get([
    "token",
    "apiBaseUrl",
  ])) as StorageData;

  if (data.token) {
    tokenInput.placeholder = maskToken(data.token);
    updateTokenBadge(true);
  } else {
    updateTokenBadge(false);
  }

  if (data.apiBaseUrl) {
    apiUrlInput.value = data.apiBaseUrl;
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────

async function handleSave(): Promise<void> {
  const token = tokenInput.value.trim();
  const apiBaseUrl = apiUrlInput.value.trim();

  if (!token && !apiBaseUrl) {
    setStatus("Nothing to save — paste your token or API URL first.", "error");
    return;
  }

  const toStore: StorageData = {};
  let messages: string[] = [];

  if (token) {
    // Basic JWT sanity check (three dot-separated parts)
    const parts = token.split(".");
    if (parts.length !== 3) {
      setStatus(
        "That doesn't look like a valid JWT (expected header.payload.signature).",
        "error",
      );
      return;
    }
    toStore.token = token;
    messages.push("token");
  }

  if (apiBaseUrl) {
    try {
      new URL(apiBaseUrl); // validates URL format
    } catch {
      setStatus(
        "API URL is not a valid URL. Include the protocol (https://).",
        "error",
      );
      return;
    }
    // Strip trailing slash for consistency
    toStore.apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
    messages.push("API URL");
  }

  await chrome.storage.local.set(toStore);

  // Clear the textarea so the token isn't visible, update placeholder
  if (toStore.token) {
    tokenInput.value = "";
    tokenInput.placeholder = maskToken(toStore.token);
    updateTokenBadge(true);
  }

  setStatus(`Saved ${messages.join(" and ")} successfully ✓`, "success");
}

// ─── Clear ────────────────────────────────────────────────────────────────────

async function handleClear(): Promise<void> {
  await chrome.storage.local.remove(["token", "apiBaseUrl"]);
  tokenInput.value = "";
  tokenInput.placeholder = "Paste your JWT token here…";
  apiUrlInput.value = "";
  updateTokenBadge(false);
  setStatus("All saved data cleared.", "info");
}

// ─── Events ───────────────────────────────────────────────────────────────────

saveBtn.addEventListener("click", () => void handleSave());
clearBtn.addEventListener("click", () => void handleClear());

// Allow Ctrl+Enter / Cmd+Enter to save from the textarea
tokenInput.addEventListener("keydown", (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    void handleSave();
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

void loadStoredValues();
