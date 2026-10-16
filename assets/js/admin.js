/* ULJR Gold — admin backend: accept tickets + live chat with customers */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => "$" + Number(n).toFixed(2);
  const shortId = id => String(id).replace(/^demo-/, "").slice(0, 8);
  const timeAgo = ts => {
    const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return s + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  };

  let tickets = [];
  let selectedId = null;
  let offMsgs = null, offTicket = null;
  let renderedIds = new Set();
  let agentName = "Agent";
  let audioCtx = null;

  const CANNED = [
    "Thanks for your order! What's your RSN (in-game name)?",
    "Payment received — delivering your gold now. Meet me in-game, I'll confirm the world and location here.",
    "I've sent your payment. Please confirm once it arrives.",
    "One moment please, checking that now.",
    "Can you trade me in-game? I'm ready whenever you are.",
  ];

  function beep() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.frequency.value = 880; g.gain.value = 0.08;
      o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
      o.stop(audioCtx.currentTime + 0.45);
    } catch {}
  }

  async function init() {
    const mode = await DB.init();
    if (mode === "demo") {
      $("loginCard").style.display = "none";
      $("setupNotice").style.display = "block";
      startDemoAdmin();
      return;
    }
    DB.onAuth(user => {
      if (user) {
        agentName = (user.email || "Agent").split("@")[0];
        $("loginCard").style.display = "none";
        $("adminUI").style.display = "block";
        startAdmin();
      } else {
        $("loginCard").style.display = "block";
        $("adminUI").style.display = "none";
      }
    });
    $("loginForm").addEventListener("submit", async e => {
      e.preventDefault();
      $("loginErr").textContent = "";
      try {
        await DB.login($("loginEmail").value.trim(), $("loginPass").value);
      } catch (ex) {
        $("loginErr").textContent = "Login failed — check email/password (and that the admin user exists in Firebase Authentication).";
      }
    });
    $("logoutBtn").onclick = () => DB.logout();
  }

  function startDemoAdmin() {
    $("adminUI").style.display = "block";
    wireUI();
    DB.onTickets(list => { tickets = list; renderList(); });
  }

  function startAdmin() {
    wireUI();
    let first = true;
    DB.onTickets(list => {
      const prevIds = new Set(tickets.map(t => t.id));
      tickets = list;
      renderList();
      list.forEach(t => {
        if (!first && !prevIds.has(t.id)) {
          beep();
          flashTitle("🔔 New ticket!");
        }
      });
      first = false;
    });
  }

  function flashTitle(msg) {
    const orig = document.title;
    document.title = msg;
    setTimeout(() => (document.title = orig), 4000);
  }

  let wired = false;
  function wireUI() {
    if (wired) return; wired = true;
    $("filterStatus").addEventListener("change", renderList);
    $("msgInput").addEventListener("keydown", e => { if (e.key === "Enter") sendReply(); });
    $("sendBtn").onclick = sendReply;
    $("acceptBtn").onclick = acceptTicket;
    $("closeBtn").onclick = closeTicket;
    const cw = $("canned");
    CANNED.forEach(c => {
      const b = document.createElement("button");
      b.textContent = c.length > 42 ? c.slice(0, 42) + "…" : c;
      b.title = c;
      b.onclick = () => { $("msgInput").value = c; $("msgInput").focus(); };
      cw.appendChild(b);
    });
  }

  function renderList() {
    const f = $("filterStatus").value;
    const list = tickets.filter(t => f === "all" || t.status === f);
    const el = $("ticketList");
    el.innerHTML = "";
    $("countLine").textContent =
      `${tickets.filter(t => t.status === "pending").length} pending · ${tickets.length} total`;
    if (!list.length) { el.innerHTML = `<div class="empty">No ${f === "all" ? "" : f} tickets.</div>`; return; }
    list.forEach(t => {
      const b = document.createElement("button");
      b.className = "ticket-item" + (t.id === selectedId ? " sel" : "");
      b.innerHTML = `
        <div class="top">
          <span class="badge ${t.type}">${t.type === "buy" ? "BUY" : "SELL"}</span>
          <span class="status-pill ${esc(t.status)}">${esc(t.status)}</span>
        </div>
        <div class="amt">${Number(t.mAmount).toLocaleString()}M · ${money(t.totalUsd)}</div>
        <div>RSN: <b>${esc(t.rsn)}</b> · ${esc(t.payMethod || "")}</div>
        <div class="time">#${shortId(t.id)} · ${timeAgo(t.createdAt)}</div>`;
      b.onclick = () => selectTicket(t.id);
      el.appendChild(b);
    });
  }

  async function selectTicket(id) {
    selectedId = id;
    renderList();
    if (offMsgs) offMsgs();
    if (offTicket) offTicket();
    renderedIds = new Set();
    $("adminMsgs").innerHTML = "";
    $("chatPane").style.display = "flex";
    const t = tickets.find(x => x.id === id);
    renderDetail(t);

    offTicket = DB.onTicket(id, nt => { if (nt) renderDetail(nt); });
    let firstMsgs = true;
    offMsgs = DB.onMessages(id, arr => {
      const box = $("adminMsgs");
      let newOnes = 0;
      arr.forEach(m => {
        if (renderedIds.has(m.id)) return;
        renderedIds.add(m.id); newOnes++;
        const d = document.createElement("div");
        d.className = "msg " + m.from;
        const label = m.from === "customer" ? esc(t.rsn || "Customer")
          : m.from === "agent" ? esc(m.agent || "Agent")
          : m.from === "bot" ? "Assistant (bot)" : "";
        d.innerHTML = (label ? `<div class="who">${label}</div>` : "") +
          `<div>${esc(m.text).replace(/\n/g, "<br>")}</div>`;
        box.appendChild(d);
      });
      box.scrollTop = box.scrollHeight;
      if (!firstMsgs && newOnes > 0) { beep(); flashTitle("💬 New message"); }
      firstMsgs = false;
    });
  }

  function renderDetail(t) {
    if (!t) return;
    $("detailTitle").innerHTML =
      `<span class="badge ${t.type}">${t.type === "buy" ? "BUY" : "SELL"}</span> ` +
      `${Number(t.mAmount).toLocaleString()}M · ${money(t.totalUsd)}`;
    $("detailMeta").innerHTML =
      `RSN: <b>${esc(t.rsn)}</b><br>Contact: ${esc(t.contact || "—")}<br>` +
      `${t.type === "buy" ? "Pays via" : "Payout via"}: ${esc(t.payMethod || "—")}` +
      (t.payout ? `<br>Payout address: <code>${esc(t.payout)}</code>` : "") +
      (t.notes ? `<br>Notes: ${esc(t.notes)}` : "") +
      `<br><span class="time">#${shortId(t.id)} · opened ${timeAgo(t.createdAt)}</span> ` +
      `<span class="status-pill ${esc(t.status)}">${esc(t.status)}</span>`;
    $("acceptBtn").style.display = t.status === "pending" ? "" : "none";
    $("closeBtn").style.display = t.status === "closed" ? "none" : "";
    const closed = t.status === "closed";
    $("msgInput").disabled = closed; $("sendBtn").disabled = closed;
  }

  async function acceptTicket() {
    if (!selectedId) return;
    const t = tickets.find(x => x.id === selectedId);
    await DB.setStatus(selectedId, "active");
    await DB.sendMessage(selectedId, "system",
      `Ticket accepted by ${agentName}.`);
    await DB.sendMessage(selectedId, "agent",
      `Hi ${t ? t.rsn : "there"}! This is ${agentName} — I've got your order and I'm on it now.`,
      { agent: agentName });
  }

  async function closeTicket() {
    if (!selectedId) return;
    if (!confirm("Close this ticket? The customer will see the chat as closed.")) return;
    await DB.sendMessage(selectedId, "system", "This ticket is now closed. Thanks for trading with us!");
    await DB.setStatus(selectedId, "closed");
  }

  async function sendReply() {
    const text = $("msgInput").value.trim();
    if (!text || !selectedId) return;
    $("msgInput").value = "";
    await DB.sendMessage(selectedId, "agent", text, { agent: agentName });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
