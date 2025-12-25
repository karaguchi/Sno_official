// ==========================================
// チケット出現監視【代表者：結】
// version: 6.5
// ==========================================


// ==========================================
// ★切り替えスイッチ　true / false
// ==========================================
const DEBUG_LOG = true;          // console.log ON/OFF
const ENABLE_AUTO_PROCEED = true; // SMS認証画面で自動押下


// ==========================================
// 0. フェーズ管理
// ==========================================
const PHASE = {
  SEARCH: "search",
  AUTH: "auth",
  AFTER_BUY: "after_buy",
};

let phase = PHASE.SEARCH;


// ==========================================
// 1. ユーティリティ & ログ
// ==========================================
const saveLog = (msg) => {
  const ts = new Date().toLocaleString("ja-JP");
  const line = `[${ts}] ${msg}`;

  const logs = JSON.parse(localStorage.getItem("ticket_logs") || "[]");
  logs.push(line);
  if (logs.length > 100) logs.shift();
  localStorage.setItem("ticket_logs", JSON.stringify(logs));

  if (DEBUG_LOG) console.log(line);
};


// ==========================================
// 2. フラッシュ通知（AUTH突入時のみ）
// ==========================================
const flashScreen = (color = "rgba(255, 255, 0, 0.5)") => {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: ${color};
    z-index: 999999;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
  `;
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    setTimeout(() => {
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 300);
    }, 180);
  });
};


// ==========================================
// 3. ページ制御
// ==========================================
const reloadWithCacheBust = (targetUrl = location.href) => {
  if (phase !== PHASE.SEARCH) return;
  const url = new URL(targetUrl);
  url.searchParams.set("t", Date.now());
  location.href = url.toString();
};


// ==========================================
// 4. 判定ロジック
// ==========================================
const isTwoTickets = (text) => /(^|\D)[2２]\s*枚/.test(text);

const isAuthPage = () =>
  location.href.includes("/checkout/attention") ||
  location.href.includes("/checkout/phone_auth");

const isAfterBuyPage = () =>
  location.href.includes("/checkout/set_seats/") ||
  document.body.innerText.includes("同行者情報入力");


// ==========================================
// 4.5 曜日判定（優先順あり）
// ==========================================
const allowedDays = ["(土)", "(金)", "(木)", "(水)"];

const getDayFromSelect = (select) => {
  const container =
    select.closest(".perform-list") ||
    select.closest(".card") ||
    select.closest(".event-row") ||
    select.closest(".form-group") ||
    select.parentElement;

  if (!container) return null;

  const m = container.innerText.match(/\((月|火|水|木|金|土|日)\)/);
  return m ? m[0] : null;
};


// ==========================================
// 5. 自動「進む」ボタン押下（SMS認証画面限定）
// ==========================================
const autoClickProceedButton = () => {
  if (!ENABLE_AUTO_PROCEED) return;
  if (sessionStorage.getItem("autoProceedDone")) return;

  const min = 500;
  const max = 1500;
  const delay = Math.floor(Math.random() * (max - min)) + min;

  const buttons = Array.from(
    document.querySelectorAll("button, input[type='button'], a.btn")
  );

  const target = buttons.find((b) => {
    const text = (b.innerText || b.value || "").trim();
    if (!text) return false;
    if (b.disabled) return false;
    if (b.offsetParent === null) return false;
    if (!text.includes("する")) return false;
    if (!/認証|送信/.test(text)) return false;
    return true;
  });

  if (!target) return;

  saveLog(`🤖 AUTO CLICK (delay ${delay}ms): ${target.innerText || target.value}`);
  sessionStorage.setItem("autoProceedDone", "1");

  setTimeout(() => target.click(), delay);
};


// ==========================================
// 6. 認証画面処理
// ==========================================
const handleAuthPage = () => {
  if (
    location.href.includes("/checkout/attention") &&
    !sessionStorage.getItem("authEntered")
  ) {
    flashScreen();
    saveLog("📱 ENTER AUTH FLOW");
    sessionStorage.setItem("authEntered", "1");
  }

  if (location.href.includes("/checkout/attention")) {
    autoClickProceedButton();
  }
};


// ==========================================
// 7. 検知 & 購入処理（SEARCH 専用）
// ==========================================
let hasClickedBuy = false;
let reloadTimer = null;

const checkAndProcess = () => {
  if (phase !== PHASE.SEARCH) return;
  if (reloadTimer) clearTimeout(reloadTimer);

  let rows = document.querySelectorAll(
    ".perform-list, .card, .event-row, .mt-3, .card-body, .form-group"
  );
  if (!rows.length) rows = [document.body];

  const candidates = [];

  for (const row of rows) {
    const select =
      row.querySelector("select.ticket-select") ||
      row.querySelector("select");
    if (!select) continue;

    const day = getDayFromSelect(select);
    if (!day || !allowedDays.includes(day)) continue;

    for (let i = 0; i < select.options.length; i++) {
      const optTxt = select.options[i].text.trim();
      if (!isTwoTickets(optTxt)) continue;

      const btn =
        row.querySelector("button[value='commit'].btn-warning") ||
        row.querySelector(".btn-buy-ticket");

      if (!btn) continue;

      candidates.push({
        day,
        dayIndex: allowedDays.indexOf(day),
        select,
        optionIndex: i,
        optionText: optTxt,
        button: btn,
      });
    }
  }

  if (!candidates.length) {
    reloadTimer = setTimeout(
      reloadWithCacheBust,
      Math.floor(Math.random() * 300 + 1200)
    );
    return;
  }

  candidates.sort((a, b) => a.dayIndex - b.dayIndex);
  const c = candidates[0];

  const notifyKey = `found_${c.day}_${c.optionText}`;
  if (!sessionStorage.getItem(notifyKey)) {
    saveLog(`FOUND: ${c.day} ${c.optionText}`);
    sessionStorage.setItem(notifyKey, "1");
  }

  c.select.selectedIndex = c.optionIndex;
  c.select.dispatchEvent(new Event("change", { bubbles: true }));

  if (!hasClickedBuy) {
    hasClickedBuy = true;
    phase = PHASE.AUTH;

    saveLog(`🛒 CLICK BUY: ${c.day} ${c.optionText}`);
    c.button.click();
  }
};


// ==========================================
// 8. 同行者自動入力（AFTER_BUY 安全強化）
// ==========================================
let companionRetry = 0;
let companionFilled = false;
let companionSubmitted = false;

const COMPANION_SUBMIT_DELAY_MIN = 800;
const COMPANION_SUBMIT_DELAY_MAX = 1600;

const fillCompanionInfo = () => {
  if (companionSubmitted) return;

  const info = {
    name: "池田尚",
    tel: "09028497825",
    birthYear: "1989",
    birthMonth: "8",
    birthDay: "1",
  };

  const name = document.querySelector(".userName");
  const tel = document.querySelector(".userTelno");

  if (!name || !tel) {
    if (companionRetry++ < 10) {
      setTimeout(fillCompanionInfo, 500);
    }
    return;
  }

  if (!companionFilled) {
    name.value = info.name;
    tel.value = info.tel;

    const b = document.querySelectorAll(".user-birthday");
    if (b.length >= 3) {
      b[0].value = info.birthYear;
      b[1].value = info.birthMonth;
      b[2].value = info.birthDay;
    }

    document.querySelectorAll("input, select").forEach((el) => {
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });

    companionFilled = true;
    saveLog("👥 Companion filled");

    const delay =
      Math.floor(
        Math.random() *
          (COMPANION_SUBMIT_DELAY_MAX - COMPANION_SUBMIT_DELAY_MIN)
      ) + COMPANION_SUBMIT_DELAY_MIN;

    setTimeout(() => {
      if (companionSubmitted) return;

      const submit = document.querySelector(".addSeat");
      if (!submit || submit.disabled) return;

      companionSubmitted = true;
      saveLog(`👥 Companion submit after ${delay}ms`);
      submit.click();
    }, delay);
  }
};


// ==========================================
// 9. 起動制御
// ==========================================
const startApp = () => {
  const bodyText = document.body.innerText || "";
  const targetDetailUrl =
    "https://relief-ticket.jp/events/artist/11/121";

  if (
    /50[0-9]/.test(document.title) ||
    bodyText.includes("504") ||
    bodyText.includes("エラー")
  ) {
    setTimeout(() => reloadWithCacheBust(targetDetailUrl), 5000);
    return;
  }

  if (isAuthPage()) {
    phase = PHASE.AUTH;
    handleAuthPage();
    return;
  }

  if (isAfterBuyPage()) {
    phase = PHASE.AFTER_BUY;
    fillCompanionInfo();
    return;
  }

  if (
    location.pathname === "/" ||
    location.pathname === "/events/artist/11"
  ) {
    setTimeout(() => reloadWithCacheBust(targetDetailUrl), 500);
    return;
  }

  checkAndProcess();
};

startApp();
