/**
 * Orderly Starter (no-code-friendly "proof of life")
 * - Serves an embedded app page Shopify can iframe
 * - Includes placeholder OAuth callback route to satisfy Redirect URL
 * - Sets CSP so Shopify admin can embed the app
 *
 * NOTE: This is intentionally minimal. Next step after this loads:
 * - Add Shopify OAuth + session verification
 * - Build your real screens
 */

const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan("tiny"));

// We do NOT use helmet's default CSP because Shopify needs iframe embedding.
// We'll set CSP manually.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Allow Shopify Admin + Shop domains to iframe the app
app.use((req, res, next) => {
  // Shopify typically passes ?shop=your-store.myshopify.com
  const shop = req.query.shop;

  // Allow admin.shopify.com and *.myshopify.com by default
  const frameAncestors = [
    "https://admin.shopify.com",
    "https://*.myshopify.com",
  ];

  // If shop param exists and looks like a myshopify domain, add it explicitly too
  if (typeof shop === "string" && shop.endsWith(".myshopify.com")) {
    frameAncestors.push(`https://${shop}`);
  }

  // Set a Shopify-friendly CSP
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

// Main embedded app page
app.get("/", (req, res) => {
  const shop = req.query.shop || "(unknown shop)";
  res.status(200).send(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Orderly</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 0; background: #0b0f17; color: #e5e7eb; }
    .wrap { max-width: 920px; margin: 0 auto; padding: 40px 20px; }
    .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 22px; }
    h1 { font-size: 28px; margin: 0 0 10px; }
    p { line-height: 1.5; margin: 10px 0; color: #cbd5e1; }
    .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: rgba(16,163,127,0.18); border: 1px solid rgba(16,163,127,0.35); color: #a7f3d0; font-size: 12px; }
    .grid { display: grid; gap: 12px; grid-template-columns: 1fr; margin-top: 14px; }
    @media(min-width: 840px){ .grid { grid-template-columns: 1fr 1fr; } }
    .box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px; padding: 14px; }
    code { color: #93c5fd; }
    a { color: #93c5fd; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="pill">✅ Orderly is live in Shopify</div>
      <h1>Welcome to Orderly</h1>
      <p>This page is your “proof of life” screen. If you can see this inside Shopify Admin, your app URL + embedding are working.</p>
      <div class="grid">
        <div class="box">
          <strong>Connected shop</strong>
          <p><code>${shop}</code></p>
        </div>
        <div class="box">
          <strong>Next build step</strong>
          <p>We’ll add a real Settings screen + carrier tracking next.</p>
        </div>
      </div>
      <p style="margin-top:16px;">You can now update Shopify to point to this URL (instead of example.com).</p>
    </div>
  </div>
</body>
</html>
  `);
});

// Placeholder OAuth callback route (Shopify expects this to exist because you added it in Redirect URLs)
app.get("/auth/callback", (req, res) => {
  res.status(200).send("Orderly starter: auth callback placeholder. Next step is implementing Shopify OAuth here.");
});

// Health check endpoint (useful for hosting providers)
app.get("/health", (req, res) => res.json({ ok: true, service: "orderly-starter" }));

app.listen(PORT, () => {
  console.log(`Orderly starter listening on port ${PORT}`);
});
