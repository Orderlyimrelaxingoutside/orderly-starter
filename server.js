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
  <title>Orderly</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 0; background: #0b0f17; color: #e5e7eb; }
    .wrap { max-width: 980px; margin: 0 auto; padding: 22px 16px 40px; }
    .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 16px; }
    .grid { display: grid; gap: 12px; }
    @media(min-width: 840px){ .grid.cols3 { grid-template-columns: 1fr 1fr 1fr; } }
    @media(min-width: 840px){ .grid.cols2 { grid-template-columns: 1fr 1fr; } }

    h1 { font-size: 20px; margin: 0; }
    h2 { font-size: 14px; margin: 0 0 10px; color: #cbd5e1; font-weight: 600; }
    p { line-height: 1.5; margin: 8px 0; color: #cbd5e1; }
    .muted { color:#94a3b8; font-size: 12px; }
    code { color: #93c5fd; }

    .topbar { display:flex; align-items:flex-start; justify-content:space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .status { font-size: 12px; color: #a7f3d0; background: rgba(16,163,127,0.18); border: 1px solid rgba(16,163,127,0.35); padding: 6px 10px; border-radius: 999px; }
    .actions { display:flex; gap:10px; flex-wrap: wrap; }

    .btn {
      display:inline-flex; align-items:center; justify-content:center; gap:8px;
      padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.18);
      background: rgba(255,255,255,0.06); color:#e5e7eb; cursor:pointer;
    }
    .btn.primary { border-color: rgba(16,163,127,0.6); background: rgba(16,163,127,0.18); }

    .metric {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 16px;
      padding: 14px;
    }
    .metric .label { font-size: 12px; color:#94a3b8; margin-bottom: 6px; }
    .metric .value { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
    .metric .hint { font-size: 12px; color:#cbd5e1; margin-top: 6px; }

    .section { margin-top: 12px; }
    .box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 14px; }
    label { display:block; font-size: 12px; color:#cbd5e1; margin-bottom: 6px; }
    input[type="text"], input[type="color"] {
      width: 100%; padding: 10px 12px; border-radius: 12px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #e5e7eb;
    }

    .toggleRow { display:flex; align-items:center; justify-content:space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .toggleRow:last-child { border-bottom: 0; }

    .pill {
      display:inline-block; font-size: 11px; padding: 4px 8px; border-radius: 999px;
      background: rgba(147,197,253,0.12); border: 1px solid rgba(147,197,253,0.22); color: #bfdbfe;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <div>
        <div class="status">✅ Orderly is active</div>
        <h1 style="margin-top:8px;">Dashboard</h1>
        <div class="muted">Shop: <code id="shopText"></code></div>
      </div>
      <div class="actions">
        <button class="btn" id="reloadBtn">Reload</button>
        <button class="btn primary" id="saveBtn">Save</button>
      </div>
    </div>

    <!-- Metrics -->
    <div class="grid cols3 section">
      <div class="metric">
        <div class="label">Orders monitored</div>
        <div class="value" id="mOrders">—</div>
        <div class="hint muted">This is a starter metric (real data next).</div>
      </div>
      <div class="metric">
        <div class="label">Updates sent</div>
        <div class="value" id="mUpdates">—</div>
        <div class="hint muted">Emails/SMS sent by Orderly.</div>
      </div>
      <div class="metric">
        <div class="label">Notifications enabled</div>
        <div class="value" id="mEnabled">—</div>
        <div class="hint muted">How many rules are ON.</div>
      </div>
    </div>

    <!-- Quick Actions + Settings -->
    <div class="grid cols2 section">
      <div class="box">
        <h2>Customer notifications</h2>

        <div class="toggleRow">
          <div>
            <div>Delay detected</div>
            <div class="muted">Send if tracking shows a delay.</div>
          </div>
          <input id="notifyDelay" type="checkbox" />
        </div>

        <div class="toggleRow">
          <div>
            <div>Out for delivery</div>
            <div class="muted">Send when package is out for delivery.</div>
          </div>
          <input id="notifyOutForDelivery" type="checkbox" />
        </div>

        <div class="toggleRow">
          <div>
            <div>Delivered</div>
            <div class="muted">Send when package is delivered.</div>
          </div>
          <input id="notifyDelivered" type="checkbox" />
        </div>

        <p class="muted" style="margin-top:10px;">
          <span class="pill">Tip</span> Start with Delivered + Delay enabled to reduce customer anxiety.
        </p>
      </div>

      <div class="box">
        <h2>Branding</h2>

        <label>Brand name</label>
        <input id="brandName" type="text" placeholder="Orderly" />
        <p class="muted">This appears in customer messages later.</p>

        <div style="height:10px;"></div>

        <label>Accent color</label>
        <input id="accent" type="color" />
        <p class="muted">Used for buttons and highlights.</p>
      </div>
    </div>

    <!-- Next up -->
    <div class="card section">
      <h2>Next</h2>
      <p style="margin:0;">
        Once tracking is connected, Orderly will automatically notify customers when a delay is detected—before they reach out.
      </p>
      <p id="msg" class="muted" style="margin-top:10px;"></p>
    </div>
  </div>

<script>
  const params = new URLSearchParams(window.location.search);
  const shop = params.get("shop") || "";
  document.getElementById("shopText").textContent = shop || "(missing shop param)";
  const msg = (t) => document.getElementById("msg").textContent = t;

  function setMetricsFromSettings(s) {
    const enabledCount =
      (s.notifyDelay ? 1 : 0) +
      (s.notifyOutForDelivery ? 1 : 0) +
      (s.notifyDelivered ? 1 : 0);

    // Starter values: stable + believable (until we wire real tracking/events)
    // You can change these later to real computed values from DB.
    document.getElementById("mEnabled").textContent = enabledCount;

    // These two are placeholders for now:
    document.getElementById("mOrders").textContent = "—";
    document.getElementById("mUpdates").textContent = "—";
  }

  async function loadSettings() {
    if (!shop) { msg("Missing ?shop= in URL. Open app from Shopify Admin."); return; }
    msg("Loading...");
    const r = await fetch(\`/api/settings?shop=\${encodeURIComponent(shop)}\`);
    const data = await r.json();
    if (!data.ok) { msg("Error: " + (data.error || "unknown")); return; }

    const s = data.settings;
    document.getElementById("brandName").value = s.brandName || "Orderly";
    document.getElementById("accent").value = s.accent || "#16a34a";
    document.getElementById("notifyDelay").checked = !!s.notifyDelay;
    document.getElementById("notifyOutForDelivery").checked = !!s.notifyOutForDelivery;
    document.getElementById("notifyDelivered").checked = !!s.notifyDelivered;

    setMetricsFromSettings(s);
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

    setMetricsFromSettings(data.settings);
    msg("✅ Saved.");
  }

  document.getElementById("saveBtn").addEventListener("click", saveSettings);
  document.getElementById("reloadBtn").addEventListener("click", loadSettings);

  loadSettings();
</script>
</body>
</html>
  `);
});

