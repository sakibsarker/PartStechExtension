# PartsTech → My Website Chrome Extension

A production-ready **Manifest V3** Chrome Extension that injects an **"Add to My Website"** button on every [PartsTech](https://app.partstech.com/) product page and syncs parts to your backend REST API using JWT authentication.

---

## Project Structure

```
Extension/
├── src/
│   ├── manifest.json      # MV3 extension manifest
│   ├── content.ts         # DOM injection + button + toasts
│   ├── background.ts      # Service worker + API calls
│   ├── popup.html         # JWT/URL manager UI
│   ├── popup.ts           # Popup logic
│   ├── styles.css         # Popup + injected button styles
│   └── icons/
│       ├── icon48.png
│       └── icon128.png
├── dist/                  # Built output (load this in Chrome)
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

---

## ⚙️ One-Time Setup

### 1. Set your API base URL

Open **`src/background.ts`** and update line:

```ts
const DEFAULT_API_BASE_URL = "https://YOUR_API_BASE_URL";
```

Replace with your actual backend, e.g. `https://api.mywebsite.com`.

> You can also set/override this at runtime through the extension popup without rebuilding.

---

## 🏗️ Build Instructions

```bash
# Install dependencies (one time)
npm install

# Build production bundle → dist/
npm run build

# Development build with live watch
npm run watch
```

The `dist/` folder will contain everything Chrome needs.

---

## 🔌 Load as Unpacked Extension (Development)

1. Run `npm run build`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the **`dist/`** folder inside this project
6. The extension icon appears in the Chrome toolbar ✓

---

## 🔑 Setting Your JWT Token

1. Click the extension icon in the toolbar — the popup opens
2. Paste your JWT token into the **JWT Token** field
3. Enter your **API Base URL** (e.g. `https://api.mywebsite.com`)
4. Click **Save**

The popup shows a masked preview of the saved token. Your token is stored securely in `chrome.storage.local` — never in plaintext in the extension code.

**Getting your token from the web app:**

```js
// Run this in your web app's DevTools console:
localStorage.getItem("token"); // or whatever key your app uses
// Copy the value and paste it into the extension popup
```

---

## 🚀 Using the Extension

1. Navigate to `https://app.partstech.com/` and log in
2. Go to any product search / listing page
3. Each product card will show an **"Add to My Website"** button
4. Click it — the extension sends:

   ```http
   POST /api/parts
   Authorization: Bearer <your-jwt>
   Content-Type: application/json

   { "part_name": "...", "price": 12.99 }
   ```

5. A green toast confirms success; a red toast shows any error

---

## 🛡️ Security

| Concern             | How it's handled                                           |
| ------------------- | ---------------------------------------------------------- |
| Token storage       | `chrome.storage.local` only — never hardcoded              |
| Token in network    | Sent only over HTTPS in `Authorization: Bearer` header     |
| 401 / expired token | Detected in service worker, user is notified via toast     |
| No token            | Blocked in service worker, toast prompts user to set token |
| Host permissions    | Scoped to `https://app.partstech.com/*` only               |

---

## 🔧 Adjusting PartsTech Selectors

If PartsTech updates their DOM, edit the `SELECTORS` object at the top of **`src/content.ts`**:

```ts
const SELECTORS = {
  card: '[data-testid="product-card"], .product-card, ...',
  name: '[data-testid="product-name"], .product-name, ...',
  price: '[data-testid="product-price"], .price, ...',
};
```

Use Chrome DevTools → Inspect Element on a product card to find the right selectors, then rebuild.

---

## 📦 Package for Production / Chrome Web Store

```bash
# 1. Build production bundle
npm run build

# 2. Zip the dist/ folder
cd dist && zip -r ../partstech-extension.zip . && cd ..
```

The resulting `partstech-extension.zip` can be uploaded to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## 🗂️ API Contract

**Endpoint:** `POST /api/parts`

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Body:**

```json
{
  "part_name": "Bosch Brake Pad Set",
  "price": 49.99
}
```

**Expected responses:**
| Status | Meaning |
|---|---|
| `200` / `201` | Success — shows green toast |
| `401` | Token expired — shows "please update token" toast |
| Other `4xx`/`5xx` | Shows error message from response body |
| Network failure | Shows "check your connection" toast |
