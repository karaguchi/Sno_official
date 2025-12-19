// content.js
console.log("監視プログラムが起動したよ！");

const checkTicket = () => {
  const targetText = "購入"; 
  if (document.body.innerText.includes(targetText)) {
    alert("チケットが出たよ！");
  } else {
    const randomDelay = Math.floor(Math.random() * (3000 - 1500) + 1500);
    setTimeout(() => {
      location.reload();
    }, randomDelay);
  }
};

// ページ読み込み完了から少し待って実行
setTimeout(checkTicket, 2000);