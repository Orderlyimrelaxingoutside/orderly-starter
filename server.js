/**
 * Orderly Starter → Settings MVP
 * - Embedded app page loads inside Shopify Admin
 * - Simple Settings screen
 * - Saves settings per shop (in-memory for now)
 */

const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Logging
app.use(morgan("tiny"));

// Shopify-friendly security headers (allow iframe embedding)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// In-memory settings store (per shop)
// NOTE: This resets if Render restarts. We'll move to a DB later.
const settingsByShop = new Map();

function defaultSettings(shop) {
  return {
    shop,
    brandName: "Orderly",
    accent: "#16a34a",
    notifyDelay: true,
    notifyOutForDelivery: true,
    notifyDelivered: true,
  };
}

// Allow Shopify Admin + myshopify.com to iframe the app
app.use((req, res, next) => {
  const shop = req.query.shop;

  const frameAncestors = ["https://admin.shopify.com", "https://*.myshopify.com"];
  if (typeof shop === "string" && shop.endsWith(".myshopify.com")) {
    frameAncestors.push(`https://${shop}`);
  }

  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self' https: data: blob:",
      "script-src 'self' 'unsafe-inline' https://cdn.shopify.com https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://cdn.shopify.com https://unpkg.com",
      "img-src 'self' https: data: blob:",
      "connect-src 'self' https:",
      `frame-ancestors ${frameAncestors.join(" ")}`,
    ].join("; ")
  );

  next();
});

/**
 * API: Get settings for this shop
 * GET /api/settings?shop=your-store.myshopify.com
 */
app.get("/api/settings", (req, res) => {
  const shop = req.query.shop;
  if (!shop || typeof shop !== "string") {
    return res.status(400).json({ ok: false, error: "Missing ?shop=" });
  }

  const current = settingsByShop.get(shop) || defaultSettings(shop);
  settingsByShop.set(shop, current);
  return res.json({ ok: true, settings: current });
});

/**
 * API: Save settings for this shop
 * POST /api/settings?shop=your-store.myshopify.com
 * body: { brandName, accent, notifyDelay, notifyOutForDelivery, notifyDelivered }
 */
app.post("/api/settings", (req, res) => {
  const shop = req.query.shop;
  if (!shop || typeof shop !== "string") {
    return res.status(400).json({ ok: false, error: "Missing ?shop=" });
  }

  const prev = settingsByShop.get(shop) || defaultSettings(shop);
  const body = req.body || {};

  const next = {
    ...prev,
    brandName: typeof body.brandName === "string" ? body.brandName.slice(0, 40) : prev.brandName,
    accent: typeof body.accent === "string" ? body.accent : prev.accent,
    notifyDelay: Boolean(body.notifyDelay),
    notifyOutForDelivery: Boolean(body.notifyOutForDelivery),
    notifyDelivered: Boolean(body.notifyDelivered),
  };

  settingsByShop.set(shop, next);
  return res.json({ ok: true, settings: next });
});

// Main embedded app page (Settings screen)
app.get("/", (req, res) => {
  const shop = (req.query.shop || "").toString();

  res.status(200).send(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Orderly Settings</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 0; background: #0b0f17; color: #e5e7eb; }
    .wrap { max-width: 920px; margin: 0 auto; padding: 28px 16px; }
    .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 18px; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    p { line-height: 1.5; margin: 10px 0; color: #cbd5e1; }
    .row { display: grid; gap: 12px; grid-template-columns: 1fr; margin-top: 14px; }
    @media(min-width: 840px){ .row { grid-template-columns: 1fr 1fr; } }
    label { display:block; font-size: 12px; color:#cbd5e1; margin-bottom: 6px; }
    input[type="text"], input[type="color"] {
      width: 100%; padding: 10px 12px; border-radius: 12px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #e5e7eb;
    }
    .box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px; padding: 14px; }
    .toggle { display:flex; align-items:center; justify-content:space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .toggle:last-child { border-bottom: 0; }
    .btn {
      display:inline-flex; align-items:center; justify-content:center; gap:8px;
      padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.18);
      background: rgba(255,255,255,0.06); color:#e5e7eb; cursor:pointer;
    }
    .btn.primary { border-color: rgba(16,163,127,0.6); background: rgba(16,163,127,0.18); }
    .muted { color:#94a3b8; font-size: 12px; }
    code { color: #93c5fd; }
    .top { display:flex; align-items:flex-start; justify-content:space-between; gap: 10px; flex-wrap: wrap; }
    .status { font-size: 12px; color: #a7f3d0; background: rgba(16,163,127,0.18); border: 1px solid rgba(16,163,127,0.35); padding: 6px 10px; border-radius: 999px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="top">
        <div>
          <div class="status">✅ Orderly Settings (MVP)</div>
          <h1>Settings</h1>
          <p class="muted">Shop: <code id="shopText"></code></p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn" id="reloadBtn">Reload</button>
          <button class="btn primary" id="saveBtn">Save</button>
        </div>
      </div>

      <div class="row">
        <div class="box">
          <label>Brand name</label>
          <input id="brandName" type="text" placeholder="Orderly" />
          <p class="muted">This shows in Orderly emails / messages later.</p>
        </div>

        <div class="box">
          <label>Accent color</label>
          <input id="accent" type="color" />
          <p class="muted">Used for buttons + highlights.</p>
        </div>
      </div>

      <div class="box" style="margin-top:12px;">
        <p style="margin:0 0 6px;"><strong>Customer notifications</strong></p>

        <div class="toggle">
          <div>
            <div>Delay detected</div>
            <div class="muted">Send if tracking shows a delay.</div>
          </div>
          <input id="notifyDelay" type="checkbox" />
        </div>

        <div class="toggle">
          <div>
            <div>Out for delivery</div>
            <div class="muted">Send when package is out for delivery.</div>
          </div>
          <input id="notifyOutForDelivery" type="checkbox" />
        </div>

        <div class="toggle">
          <div>
            <div>Delivered</div>
            <div class="muted">Send when package is delivered.</div>
          </div>
          <input id="notifyDelivered" type="checkbox" />
        </div>
      </div>

      <p id="msg" class="muted" style="margin-top:12px;"></p>
    </div>
  </div>

<script>
  const params = new URLSearchParams(window.location.search);
  const shop = params.get("shop") || "";
  document.getElementById("shopText").textContent = shop || "(missing shop param)";

  const msg = (t) => document.getElementById("msg").textContent = t;

  async function loadSettings() {
    if (!shop) { msg("Missing ?shop= in URL. Open app from Shopify Admin."); return; }
    msg("Loading settings...");
    const r = await fetch(\`/api/settings?shop=\${encodeURIComponent(shop)}\`);
    const data = await r.json();
    if (!data.ok) { msg("Error: " + (data.error || "unknown")); return; }

    const s = data.settings;
    document.getElementById("brandName").value = s.brandName || "Orderly";
    document.getElementById("accent").value = s.accent || "#16a34a";
    document.getElementById("notifyDelay").checked = !!s.notifyDelay;
    document.getElementById("notifyOutForDelivery").checked = !!s.notifyOutForDelivery;
    document.getElementById("notifyDelivered").checked = !!s.notifyDelivered;

    msg("Loaded.");
  }

  async function saveSettings() {
    if (!shop) { msg("Missing ?shop= in URL."); return; }
    msg("Saving...");
    const payload = {
      brandName: document.getElementById("brandName").value,
      accent: document.getElementById("accent").value,
      notifyDelay: document.getElementById("notifyDelay").checked,
      notifyOutForDelivery: document.getElementById("notifyOutForDelivery").checked,
      notifyDelivered: document.getElementById("notifyDelivered").checked,
    };

    const r = await fetch(\`/api/settings?shop=\${encodeURIComponent(shop)}\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!data.ok) { msg("Save failed: " + (data.error || "unknown")); return; }

    msg("✅ Saved! (If Render restarts, we’ll add a database next.)");
  }

  document.getElementById("saveBtn").addEventListener("click", saveSettings);
  document.getElementById("reloadBtn").addEventListener("click", loadSettings);

  loadSettings();
</script>
</body>
</html>
  `);
});

// Placeholder OAuth callback route (still here)
app.get("/auth/callback", (req, res) => {
  res.status(200).send("Orderly starter: auth callback placeholder. Next step is implementing Shopify OAuth here.");
});

// Health check endpoint
app.get("/health", (req, res) => res.json({ ok: true, service: "orderly-starter" }));

app.listen(PORT, () => console.log(`Orderly starter listening on port ${PORT}`));
