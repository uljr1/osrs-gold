/* ULJR Gold — buy/sell order pages: calculator + ticket creation */
(() => {
  const $ = id => document.getElementById(id);
  const page = document.body.dataset.page; // 'buy' | 'sell'
  const isBuy = page === "buy";
  const price = isBuy ? CONFIG.BUY_PRICE_PER_M : CONFIG.SELL_PRICE_PER_M;
  const minM = isBuy ? CONFIG.MIN_BUY_M : CONFIG.MIN_SELL_M;
  const methods = isBuy ? CONFIG.PAY_METHODS_BUY : CONFIG.PAY_METHODS_SELL;

  const money = n => "$" + Number(n).toFixed(2);

  function init() {
    // payment method options
    const sel = $("payMethod");
    methods.forEach(m => {
      const o = document.createElement("option");
      o.value = m.id; o.textContent = m.label;
      sel.appendChild(o);
    });

    // demo-mode banner
    DB.init().then(mode => {
      if (mode === "demo") {
        const b = document.createElement("div");
        b.className = "demo-banner";
        b.innerHTML = "🧪 <b>Demo mode</b> — the live backend isn't connected yet, so orders are saved in this browser only. The owner can connect Firebase in minutes (see FIREBASE_SETUP.md).";
        document.querySelector(".wrap").prepend(b);
      }
    });

    $("mAmount").addEventListener("input", updateTotal);
    const slider = $("mSlider");
    if (slider) {
      slider.min = minM; // keep slider floor in sync with config
      slider.addEventListener("input", () => {
        $("mAmount").value = slider.value;
        updateTotal();
      });
    }
    updateTotal();
    $("orderForm").addEventListener("submit", submit);
  }

  function mValue() {
    const v = parseFloat($("mAmount").value);
    return isNaN(v) ? 0 : v;
  }

  function updateTotal() {
    const m = mValue();
    $("totalOut").textContent = money(m * price);
    $("rateLine").textContent =
      `${m.toLocaleString()}M × $${price}/M${m < minM && m > 0 ? ` (min ${minM}M)` : ""}`;
    const slider = $("mSlider");
    if (slider && document.activeElement !== slider) {
      const lo = parseFloat(slider.min) || 0, hi = parseFloat(slider.max) || 10000;
      slider.value = Math.min(hi, Math.max(lo, m || lo));
    }
  }

  function err(msg) { $("formErr").textContent = msg || ""; }

  async function submit(e) {
    e.preventDefault();
    err("");
    const m = mValue();
    const rsn = $("rsn").value.trim();
    const contact = $("contact").value.trim();
    const payMethod = $("payMethod").value;
    const payout = $("payout") ? $("payout").value.trim() : "";
    const notes = $("notes").value.trim();

    if (!rsn) return err("Enter your RuneScape username (RSN).");
    if (!(m >= minM)) return err(`Minimum order is ${minM}M.`);
    if (!contact) return err("Add a Discord or email so the agent can reach you.");
    if (!isBuy && !payout) return err("Enter the wallet address / account where we should send your payment.");

    const btn = $("submitBtn");
    btn.disabled = true; btn.textContent = "Placing order…";
    try {
      const totalUsd = +(m * price).toFixed(2);
      const id = await DB.createTicket({
        type: isBuy ? "buy" : "sell",
        rsn, mAmount: m, totalUsd,
        pricePerM: price,
        payMethod, payout: payout || null,
        contact, notes: notes || null,
        userAgent: navigator.userAgent.slice(0, 120),
      });
      showSuccess(id, m, totalUsd);
      Chat.attach(id); // opens the chat widget with the assistant greeting
    } catch (ex) {
      console.error(ex);
      err("Couldn't place the order. Check your connection and try again.");
    } finally {
      btn.disabled = false; btn.textContent = isBuy ? "Buy gold now" : "Sell gold now";
    }
  }

  function showSuccess(id, m, totalUsd) {
    const box = $("successBox");
    box.style.display = "block";
    $("ticketId").textContent = "#" + String(id).replace(/^demo-/, "").slice(0, 8);
    $("ticketId").dataset.full = id;
    $("successSummary").textContent =
      `${isBuy ? "Buying" : "Selling"} ${m.toLocaleString()}M for ${money(totalUsd)}`;
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    $("orderForm").reset();
    updateTotal();
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("click", e => {
    if (e.target && e.target.id === "copyTid") {
      const full = $("ticketId").dataset.full;
      navigator.clipboard.writeText(full).then(() => {
        e.target.textContent = "Copied ✓";
        setTimeout(() => (e.target.textContent = "Copy full ID"), 1500);
      });
    }
  });
})();
