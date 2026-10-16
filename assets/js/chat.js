/* ============================================================
   ULJR Gold — customer live-chat widget
   Opens automatically after an order is placed. A built-in
   assistant greets the customer and holds them until an agent
   accepts the ticket in admin.html.
   ============================================================ */
const Chat = (() => {
  let ticketId = null;
  let offTicket = null, offMsgs = null;
  let lastBotReply = 0;
  let renderedIds = new Set();
  let els = {};

  const HOLD_MSG =
    "Please hold for the next available agent to assist you — " +
    "average wait is under 5 minutes. You can type your question below and we'll pick it right up.";

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function build() {
    if (document.getElementById("chat-fab")) return;
    const fab = document.createElement("button");
    fab.id = "chat-fab";
    fab.setAttribute("aria-label", "Open live chat");
    fab.innerHTML = `💬<span class="dot" id="chat-dot"></span>`;
    fab.onclick = () => toggle();

    const panel = document.createElement("div");
    panel.id = "chat-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Live chat");
    panel.innerHTML = `
      <div class="chat-head">
        <div class="av">U</div>
        <div>
          <div class="tt">${esc(CONFIG.BRAND)} Support</div>
          <div class="st"><span class="pulse"></span><span id="chat-agent-state">Typically replies in minutes</span></div>
        </div>
        <button class="x" id="chat-close" aria-label="Close chat">×</button>
      </div>
      <div id="chat-msgs"></div>
      <div class="chat-status" id="chat-status" style="display:none"></div>
      <div class="chat-input">
        <input id="chat-text" type="text" placeholder="Type your message…" autocomplete="off" maxlength="2000" />
        <button id="chat-send">➤</button>
      </div>`;
    document.body.appendChild(fab);
    document.body.appendChild(panel);

    els = {
      fab, panel,
      msgs: document.getElementById("chat-msgs"),
      text: document.getElementById("chat-text"),
      send: document.getElementById("chat-send"),
      dot: document.getElementById("chat-dot"),
      status: document.getElementById("chat-status"),
      agentState: document.getElementById("chat-agent-state"),
    };
    document.getElementById("chat-close").onclick = () => toggle(false);
    els.send.onclick = send;
    els.text.addEventListener("keydown", e => { if (e.key === "Enter") send(); });
  }

  function toggle(force) {
    build();
    const open = force !== undefined ? force : !els.panel.classList.contains("open");
    els.panel.classList.toggle("open", open);
    if (open) { els.dot.classList.remove("on"); els.msgs.scrollTop = els.msgs.scrollHeight; els.text.focus(); }
  }
  function open() { toggle(true); }
  function notify() {
    if (!els.panel.classList.contains("open")) els.dot.classList.add("on");
  }

  function whoLabel(from) {
    return from === "customer" ? "You"
      : from === "agent" ? "Support agent"
      : from === "bot" ? CONFIG.BRAND + " assistant" : "";
  }

  function renderMsg(m) {
    if (renderedIds.has(m.id)) return;
    renderedIds.add(m.id);
    const d = document.createElement("div");
    d.className = "msg " + m.from;
    const label = whoLabel(m.from);
    d.innerHTML = (label ? `<div class="who">${esc(label)}</div>` : "") +
      `<div>${esc(m.text).replace(/\n/g, "<br>")}</div>`;
    els.msgs.appendChild(d);
    els.msgs.scrollTop = els.msgs.scrollHeight;
    if (m.from === "agent" || m.from === "bot") notify();
  }

  function renderStatus(t) {
    if (!t) { els.status.style.display = "none"; return; }
    els.status.style.display = "block";
    els.status.innerHTML =
      `Ticket <b>#${esc(shortId(t.id))}</b> · <span class="status-pill ${esc(t.status)}">${esc(t.status)}</span>` +
      (t.status === "closed" ? ` · This chat is closed.` : "");
    els.text.disabled = t.status === "closed";
    els.send.disabled = t.status === "closed";
    els.agentState.textContent =
      t.status === "active" ? "An agent is with you now" :
      t.status === "closed" ? "Chat closed" : "Typically replies in minutes";
  }

  function shortId(id) { return String(id).replace(/^demo-/, "").slice(0, 8); }

  // ---- the assistant: greeting + keyword auto-replies ----
  async function botGreet(t) {
    if (t.botGreeted) return;
    try {
      const typeWord = t.type === "buy" ? "purchase" : "sale";
      const amt = `${Number(t.mAmount).toLocaleString()}M`;
      const usd = "$" + Number(t.totalUsd).toFixed(2);
      await DB.sendMessage(t.id, "bot",
        `Thanks, ${t.rsn}! Your ${typeWord} order for ${amt} (${usd}) is confirmed — ticket #${shortId(t.id)}.\n` + HOLD_MSG);
      await DB.markBotGreeted(t.id);
    } catch (e) {
      console.warn("botGreet failed:", e);
    }
  }

  function botAutoReply(text) {
    const now = Date.now();
    if (now - lastBotReply < 20000) return; // don't spam
    const t = text.toLowerCase();
    let reply = null;
    if (/(price|rate|cost|how much)/.test(t))
      reply = `Our current rates: we sell gold at $${CONFIG.BUY_PRICE_PER_M}/M and buy gold at $${CONFIG.SELL_PRICE_PER_M}/M.`;
    else if (/(how long|delivery|fast|when)/.test(t))
      reply = `Delivery is usually within 5–15 minutes of payment confirmation. We'll trade you in-game at a location the agent confirms here.`;
    else if (/(pay|payment|btc|usdt|crypto|paypal)/.test(t))
      reply = `We accept BTC, ETH, USDT, LTC, PayPal and Cash App. The agent will share the exact payment address here once they join.`;
    else if (/(human|agent|real person|someone)/.test(t))
      reply = HOLD_MSG;
    else if (/(discount|bulk)/.test(t))
      reply = `For orders over 2,000M ask the agent about a bulk rate when they join.`;
    else if (/(refund|scam|legit|safe|trust)/.test(t))
      reply = `Every trade is handled in live chat by a real agent, and payment is confirmed before any gold moves. If anything goes wrong, message us here immediately.`;
    if (reply) {
      lastBotReply = now;
      setTimeout(() => { if (ticketId) DB.sendMessage(ticketId, "bot", reply); }, 1200);
    }
  }

  async function send() {
    const text = els.text.value.trim();
    if (!text || !ticketId) return;
    els.text.value = "";
    const t = await DB.getTicket(ticketId);
    if (!t || t.status === "closed") return;
    await DB.sendMessage(ticketId, "customer", text);
    if (t.status === "pending") botAutoReply(text);
  }

  // Attach the widget to an existing ticket (after order, or via track page)
  async function attach(id, { autoGreet = true } = {}) {
    build();
    if (offTicket) offTicket();
    if (offMsgs) offMsgs();
    renderedIds = new Set();
    els.msgs.innerHTML = "";
    ticketId = id;

    offTicket = DB.onTicket(id, t => {
      if (!t) {
        els.status.style.display = "block";
        els.status.textContent = "Ticket not found. Check the ticket ID and try again.";
        return;
      }
      renderStatus(t);
      if (autoGreet && !t.botGreeted) botGreet(t);
    });
    offMsgs = DB.onMessages(id, arr => arr.forEach(renderMsg));
    open();
  }

  function currentTicket() { return ticketId; }

  return { attach, open, toggle, currentTicket };
})();
