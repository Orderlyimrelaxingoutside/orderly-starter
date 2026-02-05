# Orderly Starter (Proof of Life)

This is a tiny Node/Express app that loads inside Shopify Admin as an embedded app.

## What it does
- Serves an embedded app page at `/`
- Provides a placeholder redirect URL at `/auth/callback`
- Sets Content-Security-Policy so Shopify Admin can iframe it

## Run locally
```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy (fast) — Render (recommended for this starter)
1. Create a new **Web Service**
2. Connect this repo (GitHub) or upload the zip contents
3. Build command: `npm install`
4. Start command: `npm start`
5. Node version: 18+ (default usually OK)

## After deploy
Use your deployed URL as Shopify **App URL**, and `${APP_URL}/auth/callback` as the Redirect URL.

Then create a new app version and Release it.
