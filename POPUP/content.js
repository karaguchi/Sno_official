// ==========================================
// Snow Man 1st POP-UP 自動監視【安全強化＋人間挙動版】
// version: 1.2.0 (Balanced / Human-like)
// ==========================================

// --------------------
// 設定
// --------------------
const allowedDays = ["(土)", "(日)"];
const TARGET_REGEX = /(残り|空き|△)/;
const DEBUG_LOG = true;

// 保険リロード（人間っぽく）
const SAFE_RELOAD_INTERVAL = 15000;

// --------------------
// 状態管理
// --------------------
let hasClicked = false;
let lastActionTime = Date.now();

// --------------------
// ログ保存
// --------------------
const saveLog = (msg) => {
  const now = new Date().toLocaleTimeString();
  const logMsg = `[${now}] ${msg}`;
  if (DEBUG_LOG) console.log(logMsg);

  let logs = JSON.parse(localStorage.getItem("popup_ticket_logs") || "[]");
  logs.push(logMsg);
  if (logs.length > 200) logs.shift();
  localStorage.setItem("popup_ticket_logs", JSON.stringify(logs));
};

// --------------------
// エラー検知 & 復帰
// --------------------
const checkErrorAndRecover = () => {
  const bodyText = document.body.innerText || "";
  const isError =
    /5[0-9]{2}/.test(document.title) ||
    bodyText.includes("502") ||
    bodyText.includes("504") ||
    bodyText.includes("エラー") ||
    bodyText.includes("アクセスが集中");

  if (isError) {
    const delay = Math.floor(Math.random() * 3000 + 3000);
    saveLog(`⚠️ サーバーエラー検知。${delay}ms後に再読込`);
    setTimeout(() => location.reload(), delay);
    return true;
  }
  return false;
};

// --------------------
// 人間っぽい遅延 & スクロール
// --------------------
const humanDelay = () =>
  new Promise(r => setTimeout(r, 150 + Math.random() * 200));

const humanScroll = () => {
  const delta = Math.floor(Math.random() * 120 + 40);
  window.scrollBy({
    top: delta,
    behavior: "smooth"
  });
};

// --------------------
// 安全フラッシュ（押下要素のみ）
// --------------------
const flashElement = (el) => {
  const prev = el.style.boxShadow;
  el.style.boxShadow = "0 0 0 4px rgba(255,0,0,0.8)";
  setTimeout(() => {
    el.style.boxShadow = prev;
  }, 500);
};

// --------------------
// 実際にクリック（1回だけ）
// --------------------
const tryClick = async (el, reason) => {
  if (hasClicked) return;
  hasClicked = true;

  saveLog(`🎯 押下準備：${reason}`);

  humanScroll();        // 軽くスクロール
  await humanDelay();   // 150〜350ms 揺らぎ

  lastActionTime = Date.now();
  saveLog(`🖱 押下実行：${reason}`);

  flashElement(el);
  el.click();
};

// --------------------
// スロット解析 & 判定
// --------------------
const checkSlots = () => {
  if (hasClicked) return;

  const slots = document.querySelectorAll('.c-TimeSlotSelectorTimeSlot');
  if (slots.length === 0) {
    saveLog("⏳ 時間枠DOM未検出");
    return;
  }

  saveLog(`🔍 スロット検出数: ${slots.length}`);

  for (const slot of slots) {
    if (hasClicked) break;

    // 日付取得
    const dateLabel =
      slot.closest('.p-TimeSlotSelectorDate')
          ?.querySelector('.p-TimeSlotSelectorDate__label')
          ?.innerText || "";

    if (!dateLabel) {
      saveLog("⚠️ 日付ラベル取得失敗");
      continue;
    }

    const isTargetDay = allowedDays.some(d => dateLabel.includes(d));
    saveLog(`📅 日付確認: ${dateLabel} → ${isTargetDay ? "対象" : "対象外"}`);

    if (!isTargetDay) continue;

    // ステータス取得
    const statusEl = slot.querySelector('.c-TimeSlotSelectorTimeSlotStatus__text');
    const statusText = statusEl?.innerText.trim() || "";

    saveLog(`⏱ 状態確認: ${dateLabel} / "${statusText || "なし"}"`);

    if (!TARGET_REGEX.test(statusText)) continue;
    // 空きあり検出ログ（ここから）
    saveLog(`💚💚💚 空きあり検出 💚💚💚 ${dateLabel} / ${statusText}`);

    console.log(
      "%c💚💚💚 空きあり検出 💚💚💚",
      "color:#2ecc71;font-size:22px;font-weight:bold;"
    );

    document.title = "💚 空きあり発見！！";


    // 押下可能要素探索
    const clickable =
      slot.querySelector('button') ||
      slot.closest('button') ||
      slot;

    if (!clickable) {
      saveLog("❌ 押下対象が見つからない");
      continue;
    }

    tryClick(clickable, `${dateLabel} / ${statusText}`);
    break;
  }
};

// --------------------
// DOM監視（限定）
// --------------------
const setupObserver = () => {
  const target = document.querySelector('.p-TimeSlotSelector');
  if (!target) {
    saveLog("⏳ 監視対象DOM未検出（再試行）");
    setTimeout(setupObserver, 1000);
    return;
  }

  saveLog("👀 DOM監視開始");

  const observer = new MutationObserver(() => {
    lastActionTime = Date.now();
    checkSlots();
  });

  observer.observe(target, {
    childList: true,
    subtree: true
  });
};

// --------------------
// 保険リロード（控えめ）
// --------------------
setInterval(() => {
  if (hasClicked) return;

  const idle = Date.now() - lastActionTime;
  if (idle > SAFE_RELOAD_INTERVAL) {
    saveLog("🔄 保険リロード実行");
    location.reload();
  }
}, 5000);

// --------------------
// 起動
// --------------------
(() => {
  saveLog("🚀 安全強化＋人間挙動版 監視開始");
  if (checkErrorAndRecover()) return;

  setupObserver();
  checkSlots(); // 初回チェック
})();
