// ─── Types ────────────────────────────────────────────────────────────────────

interface AddPartMessage {
  type: "ADD_PART";
  payload: {
    part_name: string;
    price: number;
  };
}

interface BackgroundResponse {
  ok: boolean;
  error?: "NO_TOKEN" | "TOKEN_EXPIRED" | "NETWORK_ERROR" | string;
}

interface StorageData {
  token?: string;
  apiBaseUrl?: string;
}

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Your backend API base URL.
 * Override this in the popup (stored in chrome.storage.local as `apiBaseUrl`),
 * or change the default here before building.
 */
const DEFAULT_API_BASE_URL = "https://YOUR_API_BASE_URL";

// ─── API Call ─────────────────────────────────────────────────────────────────

async function addPart(
  partName: string,
  price: number,
  token: string,
  apiBaseUrl: string,
): Promise<BackgroundResponse> {
  const url = `${apiBaseUrl}/api/parts`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ part_name: partName, price }),
    });
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }

  if (response.status === 401) {
    return { ok: false, error: "TOKEN_EXPIRED" };
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as {
        message?: string;
        error?: string;
      };
      errorMessage = body.message ?? body.error ?? errorMessage;
    } catch {
      // Ignore JSON parse failure — use status code message instead
    }
    return { ok: false, error: errorMessage };
  }

  return { ok: true };
}

// ─── Message Listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: BackgroundResponse) => void,
  ) => {
    const msg = message as AddPartMessage;

    if (msg.type !== "ADD_PART") return false; // Not handled by this listener

    // Handle async inside the listener by returning true (keeps channel open)
    (async () => {
      const storage = (await chrome.storage.local.get([
        "token",
        "apiBaseUrl",
      ])) as StorageData;

      const token = storage.token?.trim();
      const apiBaseUrl = storage.apiBaseUrl?.trim() || DEFAULT_API_BASE_URL;

      if (!token) {
        sendResponse({ ok: false, error: "NO_TOKEN" });
        return;
      }

      const { part_name, price } = msg.payload;
      const result = await addPart(part_name, price, token, apiBaseUrl);
      sendResponse(result);
    })();

    return true; // Keep the message channel open for async sendResponse
  },
);

console.log("[PTS Extension] Background service worker started.");
