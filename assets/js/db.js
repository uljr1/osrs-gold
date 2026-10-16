/* ============================================================
   ULJR Gold — data layer
   Firebase Realtime Database when configured, otherwise a
   localStorage demo mode so the site is testable immediately.
   ============================================================ */
const DB = (() => {
  const isConfigured = () =>
    typeof CONFIG !== "undefined" &&
    CONFIG.firebase &&
    CONFIG.firebase.apiKey &&
    !String(CONFIG.firebase.apiKey).includes("REPLACE");

  let mode = "demo"; // 'firebase' | 'demo'
  let fb = null;     // firebase namespace
  let database = null;
  let auth = null;

  const LS_KEY = "uljrgold_demo_tickets_v1";
  const demoListeners = { tickets: [], ticket: {}, messages: {} };

  function demoAll() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
    catch { return {}; }
  }
  function demoSave(all) {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
    demoListeners.tickets.forEach(cb => cb(Object.values(all)));
  }
  function demoTouchTicket(id) {
    const t = demoAll()[id];
    if (!t) return;
    (demoListeners.ticket[id] || []).forEach(cb => cb({ ...t }));
    (demoListeners.messages[id] || []).forEach(cb => cb([...(t.messages || [])]));
  }
  function demoId() {
    return "demo-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  async function init() {
    if (isConfigured() && window.firebase) {
      try {
        fb = window.firebase;
        if (!fb.apps.length) fb.initializeApp(CONFIG.firebase);
        database = fb.database();
        auth = fb.auth();
        mode = "firebase";
      } catch (e) {
        console.warn("Firebase init failed, falling back to demo mode:", e);
        mode = "demo";
      }
    } else {
      mode = "demo";
    }
    return mode;
  }

  const getMode = () => mode;

  // ---------- tickets ----------
  async function createTicket(data) {
    const base = {
      ...data,
      status: "pending",          // pending -> active -> closed
      botGreeted: false,
      createdAt: Date.now(),
    };
    if (mode === "firebase") {
      const ref = database.ref("tickets").push();
      await ref.set({ ...base, createdAt: fb.database.ServerValue.TIMESTAMP });
      return ref.key;
    }
    const id = demoId();
    const all = demoAll();
    all[id] = { ...base, id, messages: [] };
    demoSave(all);
    return id;
  }

  async function getTicket(id) {
    if (mode === "firebase") {
      const snap = await database.ref("tickets/" + id).get();
      return snap.exists() ? { id, ...snap.val() } : null;
    }
    const t = demoAll()[id];
    return t ? { ...t } : null;
  }

  function onTicket(id, cb) {
    if (mode === "firebase") {
      const ref = database.ref("tickets/" + id);
      const h = ref.on("value", s => cb(s.exists() ? { id, ...s.val() } : null));
      return () => ref.off("value", h);
    }
    demoListeners.ticket[id] = demoListeners.ticket[id] || [];
    demoListeners.ticket[id].push(cb);
    cb(getTicketSync(id));
    return () => {
      demoListeners.ticket[id] = (demoListeners.ticket[id] || []).filter(f => f !== cb);
    };
  }
  function getTicketSync(id) {
    const t = demoAll()[id];
    return t ? { ...t } : null;
  }

  // Admin: list tickets (newest first)
  function onTickets(cb) {
    if (mode === "firebase") {
      const ref = database.ref("tickets").orderByChild("createdAt").limitToLast(100);
      const h = ref.on("value", s => {
        const arr = [];
        s.forEach(c => arr.push({ id: c.key, ...c.val() }));
        cb(arr.reverse());
      });
      return () => ref.off("value", h);
    }
    demoListeners.tickets.push(cb);
    cb(Object.values(demoAll()).sort((a, b) => b.createdAt - a.createdAt));
    return () => {
      demoListeners.tickets = demoListeners.tickets.filter(f => f !== cb);
    };
  }

  async function setStatus(id, status, agentName) {
    if (mode === "firebase") {
      await database.ref("tickets/" + id + "/status").set(status);
      return;
    }
    const all = demoAll();
    if (all[id]) { all[id].status = status; demoSave(all); demoTouchTicket(id); }
  }

  async function markBotGreeted(id) {
    if (mode === "firebase") {
      await database.ref("tickets/" + id + "/botGreeted").set(true);
      return;
    }
    const all = demoAll();
    if (all[id]) { all[id].botGreeted = true; demoSave(all); }
  }

  // ---------- messages ----------
  // from: 'customer' | 'agent' | 'bot' | 'system'
  async function sendMessage(ticketId, from, text, extra = {}) {
    const msg = { from, text: String(text).slice(0, 2000), ts: Date.now(), ...extra };
    if (mode === "firebase") {
      const ref = database.ref(`tickets/${ticketId}/messages`).push();
      await ref.set({ ...msg, ts: fb.database.ServerValue.TIMESTAMP });
      return ref.key;
    }
    const all = demoAll();
    if (!all[ticketId]) return null;
    all[ticketId].messages = all[ticketId].messages || [];
    const mid = "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    all[ticketId].messages.push({ id: mid, ...msg });
    demoSave(all); demoTouchTicket(ticketId);
    return mid;
  }

  function onMessages(ticketId, cb) {
    if (mode === "firebase") {
      const ref = database.ref(`tickets/${ticketId}/messages`).orderByChild("ts").limitToLast(200);
      const h = ref.on("value", s => {
        const arr = [];
        s.forEach(c => arr.push({ id: c.key, ...c.val() }));
        cb(arr);
      });
      return () => ref.off("value", h);
    }
    demoListeners.messages[ticketId] = demoListeners.messages[ticketId] || [];
    demoListeners.messages[ticketId].push(cb);
    const t = demoAll()[ticketId];
    cb([...((t && t.messages) || [])]);
    return () => {
      demoListeners.messages[ticketId] =
        (demoListeners.messages[ticketId] || []).filter(f => f !== cb);
    };
  }

  // ---------- auth (admin) ----------
  async function login(email, password) {
    if (mode !== "firebase") throw new Error("demo");
    await auth.signInWithEmailAndPassword(email, password);
  }
  async function logout() {
    if (mode === "firebase") await auth.signOut();
  }
  function onAuth(cb) {
    if (mode === "firebase") return auth.onAuthStateChanged(cb);
    cb(null);
    return () => {};
  }

  return {
    init, getMode, createTicket, getTicket, onTicket, onTickets,
    setStatus, markBotGreeted, sendMessage, onMessages,
    login, logout, onAuth,
  };
})();
