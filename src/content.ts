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

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * CSS selectors used to locate PartsTech product cards.
 * Adjust these if PartsTech updates their DOM structure.
 */
const SELECTORS = {
  // Containers that represent a single product card
  card: [
    '[data-testid="product-card"]',
    ".product-card",
    ".part-card",
    ".search-result-item",
    ".product-result",
    '[class*="ProductCard"]',
    '[class*="PartCard"]',
    '[class*="product-item"]',
  ].join(", "),

  // Name element within a card
  name: [
    '[data-testid="product-name"]',
    '[data-testid="part-name"]',
    ".product-name",
    ".part-name",
    ".part-description",
    '[class*="ProductName"]',
    '[class*="PartName"]',
    "h2",
    "h3",
  ].join(", "),

  // Price element within a card
  price: [
    '[data-testid="product-price"]',
    '[data-testid="part-price"]',
    ".product-price",
    ".part-price",
    ".price",
    '[class*="Price"]',
    '[class*="price"]',
  ].join(", "),
};

const INJECTED_ATTR = "data-pts-injected";
const BUTTON_CLASS = "pts-add-btn";
const TOAST_CLASS = "pts-toast";

// ─── DOM Helpers ──────────────────────────────────────────────────────────────

function extractPrice(raw: string): number {
  // Strip currency symbols, commas, spaces; keep digits and dot
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function showToast(message: string, success: boolean): void {
  // Remove any existing toast first
  document.querySelectorAll(`.${TOAST_CLASS}`).forEach((el) => el.remove());

  const toast = document.createElement("div");
  toast.className = `${TOAST_CLASS} ${success ? "pts-toast--success" : "pts-toast--error"}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger enter animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("pts-toast--visible"));
  });

  // Auto-dismiss after 3.5 s
  setTimeout(() => {
    toast.classList.remove("pts-toast--visible");
    toast.addEventListener("transitionend", () => toast.remove(), {
      once: true,
    });
  }, 3500);
}

// ─── Button Injection ─────────────────────────────────────────────────────────

function injectButton(card: Element): void {
  if (card.hasAttribute(INJECTED_ATTR)) return;
  card.setAttribute(INJECTED_ATTR, "true");

  const nameEl = card.querySelector(SELECTORS.name);
  const priceEl = card.querySelector(SELECTORS.price);

  const partName = nameEl?.textContent?.trim() ?? "Unknown Part";
  const priceRaw = priceEl?.textContent?.trim() ?? "0";
  const price = extractPrice(priceRaw);

  const btn = document.createElement("button");
  btn.className = BUTTON_CLASS;
  btn.textContent = "Add to My Website";
  btn.setAttribute("aria-label", `Add ${partName} to your website`);
  btn.title = `${partName} — $${price.toFixed(2)}`;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Adding…";

    const message: AddPartMessage = {
      type: "ADD_PART",
      payload: { part_name: partName, price },
    };

    try {
      const response = (await chrome.runtime.sendMessage(
        message,
      )) as BackgroundResponse;

      if (response.ok) {
        btn.textContent = "✓ Added!";
        btn.classList.add("pts-add-btn--success");
        showToast(`"${partName}" added to your website!`, true);
      } else {
        btn.disabled = false;
        btn.textContent = "Add to My Website";

        switch (response.error) {
          case "NO_TOKEN":
            showToast(
              "No token found. Please set your JWT in the extension popup.",
              false,
            );
            break;
          case "TOKEN_EXPIRED":
            showToast(
              "Token expired — please update it in the extension popup.",
              false,
            );
            break;
          case "NETWORK_ERROR":
            showToast(
              "Network error — check your connection and try again.",
              false,
            );
            break;
          default:
            showToast(`Error: ${response.error ?? "Unknown error"}`, false);
        }
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Add to My Website";
      showToast("Extension error — please reload the page.", false);
      console.error("[PTS Extension] sendMessage error:", err);
    }
  });

  // Append button at the bottom of the card
  card.appendChild(btn);
}

// ─── Card Scanner ─────────────────────────────────────────────────────────────

function scanAndInject(): void {
  const cards = document.querySelectorAll<Element>(SELECTORS.card);
  cards.forEach(injectButton);
}

// ─── MutationObserver (SPA / infinite scroll) ─────────────────────────────────

const observer = new MutationObserver((mutations) => {
  let shouldScan = false;

  for (const mut of mutations) {
    if (mut.addedNodes.length > 0) {
      shouldScan = true;
      break;
    }
  }

  if (shouldScan) scanAndInject();
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial scan on page load
scanAndInject();

console.log("[PTS Extension] Content script loaded.");
