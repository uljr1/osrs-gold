# ULJR Gold — OSRS gold buy/sell site

Live business site: customers buy OSRS gold at **$0.215/M** and sell at **$0.1792/M**.
Orders open an instant live chat; a built-in assistant greets the customer and holds
them ("Please hold for the next available agent to assist you") until the owner
accepts the ticket in the admin dashboard and chats with them directly.

## Pages
| File | What it is |
|---|---|
| `index.html` | Landing: prices, how it works, FAQ |
| `buy.html` | Buy-gold calculator + order form → creates ticket, opens chat |
| `sell.html` | Sell-gold calculator + order form → creates ticket, opens chat |
| `track.html` | Customer enters ticket ID → reopens their chat |
| `admin.html` | Owner login → ticket queue → accept / chat / close |

## Backend (free)
Firebase Realtime Database + Authentication (Spark plan = free).
Rules: `firebase-rules.json`. Setup walkthrough: `FIREBASE_SETUP.md`.

- Customers can **create** tickets and **append** chat messages (unguessable ticket IDs).
- Only the logged-in admin can **list** tickets or change status (pending → active → closed).
- Until `assets/js/config.js` has real Firebase values, the site runs in **demo mode**
  (tickets in browser localStorage, assistant still works, admin shows a setup notice).

## Config
All business settings live in `assets/js/config.js`: brand, both prices, minimums,
payment methods, contact info, Firebase keys. One file, plain values.

## Deploy (GitHub Pages)
1. Create a public repo (e.g. `uljr1/osrs-gold`), upload all files keeping the folder structure.
2. Repo **Settings → Pages** → Deploy from branch → `main` / `(root)` → Save.
3. Live at `https://uljr1.github.io/osrs-gold/` in ~1 minute.

## Notes
- Wallet addresses are intentionally NOT published on the site — the agent shares the
  correct payment address inside live chat after each order (safer against address-swap scams).
- The site never asks for RuneScape passwords. Footer carries the Jagex non-affiliation disclaimer.
