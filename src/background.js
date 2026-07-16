import { handleSearch } from "./handler.js";
import { setAliases } from "./lib/aliases.js";
import { loadAliases } from "./lib/remote-aliases.js";

// service worker 每次被喚醒都會跑到這裡。loadAliases 有快取（一天一次），
// 所以平常只是讀一次本機快取，不會每次都打網路。抓不到就沿用內建字典。
const aliasesReady = loadAliases()
  .then((remote) => {
    if (remote) setAliases(remote);
  })
  .catch((err) => console.error("[background] 載入綽號字典失敗", err));

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SEARCH_FORUMS") {
    // 等字典就緒再搜，避免第一次查詢用到舊字典而漏抓
    aliasesReady
      .then(() => handleSearch(message.company, message.industry))
      .then(sendResponse)
      .catch((err) => {
        console.error("[background] handleSearch failed", err);
        sendResponse({ results: [] });
      });
    return true; // 保持訊息通道開啟以支援非同步回覆
  }
  return false;
});
