/* ============================================================
   OG Gold — site configuration
   Edit these values to rebrand / reprice / go live.
   ============================================================ */
const CONFIG = {
  BRAND: "OG Gold",
  TAGLINE: "Fast, safe OSRS gold — delivered in minutes",

  // ---- Pricing (USD per 1M OSRS gold) ----
  BUY_PRICE_PER_M: 0.215,    // customer BUYS gold from you at this rate
  SELL_PRICE_PER_M: 0.1792,  // you BUY gold from the customer at this rate

  MIN_BUY_M: 10,   // minimum order when a customer buys gold
  MIN_SELL_M: 10,  // minimum order when a customer sells gold

  // ---- Contact (shown on site + used as fallback) ----
  CONTACT_DISCORD: "REPLACE_ME",   // e.g. "uljrgold"
  CONTACT_EMAIL: "REPLACE_ME",     // e.g. "support@uljrgold.com"

  // ---- Payment methods customers can choose ----
  // Wallet addresses are NOT published here — the agent shares the
  // correct address inside the live chat after the order is placed.
  PAY_METHODS_BUY: [   // customer pays YOU (they buy gold)
    { id: "btc",    label: "Bitcoin (BTC)" },
    { id: "eth",    label: "Ethereum (ETH)" },
    { id: "usdt",   label: "USDT (Tether)" },
    { id: "ltc",    label: "Litecoin (LTC)" },
    { id: "paypal", label: "PayPal" },
    { id: "cashapp",label: "Cash App" },
  ],
  PAY_METHODS_SELL: [  // YOU pay the customer (they sell gold)
    { id: "btc",    label: "Bitcoin (BTC)" },
    { id: "eth",    label: "Ethereum (ETH)" },
    { id: "usdt",   label: "USDT (Tether)" },
    { id: "ltc",    label: "Litecoin (LTC)" },
    { id: "paypal", label: "PayPal" },
    { id: "cashapp",label: "Cash App" },
  ],

  // ---- Firebase (free backend for tickets + live chat) ----
  // Paste your web app config here after following FIREBASE_SETUP.md.
  // Until then the site runs in DEMO mode (orders saved in this
  // browser only, chat bot still works, admin shows a setup notice).
  firebase: {
    apiKey: "REPLACE_ME",
    authDomain: "REPLACE_ME",
    databaseURL: "REPLACE_ME",
    projectId: "REPLACE_ME",
    appId: "REPLACE_ME",
  },
};
