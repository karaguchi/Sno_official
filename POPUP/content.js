// ==========================================
// Snow Man Pop-up Ticket Monitor (複数日対応)
// ==========================================

// console.log ON/OFF
    const DEBUG_LOG = true;

// SMS認証画面で自動押下
    const ENABLE_AUTO_PROCEED = false;

// 行ける日付のIDを優先順位順にリストアップ
    const TARGET_DATES = [
    "id-2026-02-08"
    // ,"id-2026-02-11"
    // ,"id-2026-02-14"
];

// 除外したい開始時間（全日程共通）
    const ignoreStartList = ["10:00", "19:00"];

    
const saveLog = (msg) => {
  if (DEBUG_LOG) {
    const ts = new Date().toLocaleTimeString();
    console.log(`[${ts}] ${msg}`);
  }
};

// メインロジック
const findAndClickSlot = () => {
  // 指定した日付リストを順番にチェック
  for (const dateId of TARGET_DATES) {
    const dateContainer = document.getElementById(dateId);
    if (!dateContainer) continue; // この日付がページになければ次へ

    saveLog(`📅 ${dateId} をチェック中...`);

    const allSlots = Array.from(dateContainer.querySelectorAll(".TimeSlotSelectorTimeSlot"));
    
    for (const slot of allSlots) {
      const timeText = slot.querySelector(".TimeSlotSelectorTimeSlot__timeRange")?.innerText || "";
      
      // 除外チェック
      const isIgnore = ignoreStartList.some(time => timeText.startsWith(time));
      if (isIgnore) continue;

      // 空きチェック
      const isUnavailable = slot.querySelector(".status-unavailable");
      if (!isUnavailable) {
        saveLog(`✨ 空き発見！ 日付ID: ${dateId}, 時間: ${timeText}`);
        slot.click();
        return true; 
      }
    }
  }

  saveLog("❌ 指定した全ての日程で空きが見つからなかったよ。");
  return false;
};

// 監視・リロード処理
const startMonitoring = () => {
  if (sessionStorage.getItem("clicked_slot")) return;

  const found = findAndClickSlot();

  if (found) {
    sessionStorage.setItem("clicked_slot", "true");
    saveLog("🚀 クリック成功！");
  } else {
    const delay = Math.floor(Math.random() * 1000) + 2000;
    saveLog(`🔄 ${delay}ms 後にリロードして再試行するね。`);
    
    setTimeout(() => {
      const url = new URL(location.href);
      url.searchParams.set("t", Date.now());
      location.href = url.toString();
    }, delay);
  }
};

window.addEventListener("load", () => {
  setTimeout(startMonitoring, 1000);
});