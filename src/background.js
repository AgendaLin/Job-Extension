import { handleSearch } from "./handler.js";

// [Stage 2 spike] 暫時的 Dcard 探針：在 background 從擴充自己的 context 打一次 Dcard
// 搜尋 API，用來實測「跨網域 fetch 會不會帶 cf_clearance、溫/冷各是什麼結果」。
// 驗證完會移除，換成正式的 Dcard 抓取器。
async function dcardProbe(company) {
  const term =
    String(company || "")
      .split("_")
      .pop()
      .replace(/股份有限公司|有限公司/g, "")
      .trim() || String(company || "");
  const url = `https://www.dcard.tw/service/api/v2/search/posts?query=${encodeURIComponent(
    term
  )}&limit=5`;
  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const text = await res.text();
    let count = null;
    let blocked = false;
    try {
      const json = JSON.parse(text);
      count = Array.isArray(json) ? json.length : null;
    } catch {
      blocked = true; // 不是 JSON = 多半是 Cloudflare 挑戰頁
    }
    return { term, status: res.status, ok: res.ok, count, blocked, sample: text.slice(0, 80) };
  } catch (err) {
    return { term, error: String(err) };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SEARCH_FORUMS") {
    Promise.all([handleSearch(message.company), dcardProbe(message.company)])
      .then(([result, dcardProbeResult]) => {
        sendResponse({ ...result, dcardProbe: dcardProbeResult });
      })
      .catch((err) => {
        console.error("[background] handleSearch failed", err);
        sendResponse({ results: [] });
      });
    return true; // 保持訊息通道開啟以支援非同步回覆
  }
  return false;
});
