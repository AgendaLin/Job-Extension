import { handleSearch } from "./handler.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SEARCH_FORUMS") {
    handleSearch(message.company)
      .then(sendResponse)
      .catch((err) => {
        console.error("[background] handleSearch failed", err);
        sendResponse({ results: [] });
      });
    return true; // 保持訊息通道開啟以支援非同步回覆
  }
  return false;
});
