// ==========================================
// チケット出現監視【ログ記録のみ】
// version: 1.0.1
// ==========================================

// ==========================================
// ★設定
// ==========================================
const DEBUG_LOG = true;

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
// 2. ページ制御（監視のためのリロード）
// ==========================================
const reloadWithCacheBust = (targetUrl = location.href) => {
  const url = new URL(targetUrl);
  url.searchParams.set("t", Date.now());
  location.href = url.toString();
};

// ==========================================
// 3. 判定ロジック
// ==========================================
const isTwoTickets = (text) => /(^|\D)[2２]\s*枚/.test(text);

const allowedDays = ["(日)", "(月)", "(火)", "(水)"];

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
// 4. 検知のみを行うメインロジック
// ==========================================
const checkAndLog = () => {
  saveLog("ページ内をスキャン中...")
  
  let rows = document.querySelectorAll(
    ".perform-list, .card, .event-row, .mt-3, .card-body, .form-group"
  );
  if (!rows.length) rows = [document.body];

  let found = false;

  for (const row of rows) {
    const select = row.querySelector("select.ticket-select") || row.querySelector("select");
    if (!select) continue;

    const day = getDayFromSelect(select);
    if (!day || !allowedDays.includes(day)) continue;

    for (let i = 0; i < select.options.length; i++) {
      const optTxt = select.options[i].text.trim();
      
      // 条件に合致するチケットがあるかチェック
      if (isTwoTickets(optTxt)) {
        found = true;
        const notifyKey = `found_${day}_${optTxt}`;
        
        // 同じチケットで何度もログが出ないように制御
        if (!sessionStorage.getItem(notifyKey)) {
          saveLog(`✨ 【検知】条件一致: ${day} ${optTxt}`);
          sessionStorage.setItem(notifyKey, "1");
          
          // 目立つようにコンソールにも出力
          console.warn("💚 条件に合うチケットを見つけました！手動で操作してください。");
        }
      }
    }
  }

  // 見つからなかった場合はリロードして監視を継続
  if (!found) {
    const delay = Math.floor(Math.random() * 500 + 1500);
    // ★追加：見つからなかった時のログ
    saveLog(`❌ 条件に合うチケットはありません。 ${delay}ms 後に再試行。`);
    
    setTimeout(
      () => reloadWithCacheBust(),
      delay
    );
  } else {
    // ★追加：見つかった時に更新を止めるログ
    saveLog("💚 チケットを発見したため、自動更新を停止しました。");
  }
};

// ==========================================
// 5. 起動
// ==========================================
const startApp = () => {
  const bodyText = document.body.innerText || "";
  const targetDetailUrl = "https://relief-ticket.jp/events/artist/31/118";

  // エラー画面なら5秒後にリダイレクト
  if (
    /50[0-9]/.test(document.title) ||
    bodyText.includes("504") ||
    bodyText.includes("エラー")
  ) {
    saveLog("エラー画面を検知。5秒後にリダイレクトします");
    setTimeout(() => reloadWithCacheBust(targetDetailUrl), 5000);
    return;
  }

  // 監視ページ以外なら詳細ページへ飛ばす
  if (
    location.pathname === "/" ||
    location.pathname === "/events/artist/31"
  ) {
    saveLog("監視対象ページへ移動します...");
    setTimeout(() => reloadWithCacheBust(targetDetailUrl), 500);
    return;
  }

  // 監視開始
  checkAndLog();
};

startApp();