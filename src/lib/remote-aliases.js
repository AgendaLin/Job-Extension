// 共用綽號字典：字典放在 GitHub 上的靜態 JSON，擴充定期抓下來快取。
//
// 為什麼不是寫死在程式裡：綽號對照永遠會有漏網之魚（新公司、少見的組織型態），
// 而字典若寫死，每加一家公司就要重新送審 Chrome 商店、等好幾天到兩週。
// 改成遠端 JSON 後，改一行 push 上去，所有使用者幾小時內就自動拿到。
//
// 注意：MV3 禁止「遠端程式碼」，但遠端「資料」是允許的。這裡抓的是純資料。
// 抓不到、或內容壞掉時一律退回內建字典，功能不會因此中斷。

export const REMOTE_ALIASES_URL =
  "https://raw.githubusercontent.com/AgendaLin/Job-Extension/main/data/aliases.json";

export const CACHE_KEY = "jfrAliases";
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 一天抓一次就夠，字典不常變

// 驗證遠端內容。壞掉的單筆丟掉，整包不可用時回 null——
// 沒驗證就套用的話，一個手誤的 commit 會讓所有使用者的搜尋壞掉。
export function parseAliasPayload(payload) {
  const list = payload?.aliases;
  if (!Array.isArray(list) || list.length === 0) return null;

  const valid = list.filter(
    (e) =>
      e &&
      typeof e.match === "string" &&
      e.match.length > 0 &&
      Array.isArray(e.nicknames) &&
      e.nicknames.length > 0 &&
      e.nicknames.every((n) => typeof n === "string" && n.length > 0)
  );
  return valid.length > 0 ? valid : null;
}

export async function loadAliases({
  fetchFn = fetch,
  storage = chrome.storage.local,
  now = Date.now(),
  url = REMOTE_ALIASES_URL,
} = {}) {
  const cached = (await storage.get(CACHE_KEY))?.[CACHE_KEY] ?? null;

  if (cached && now - cached.at < CACHE_TTL_MS) return cached.aliases;

  try {
    const res = await fetchFn(url);
    if (res.ok) {
      const aliases = parseAliasPayload(await res.json());
      if (aliases) {
        await storage.set({ [CACHE_KEY]: { at: now, aliases } });
        return aliases;
      }
    }
  } catch (err) {
    console.error("[aliases] 遠端字典抓取失敗，沿用既有資料", err);
  }

  // 抓不到或內容壞掉：有舊快取就繼續用，否則回 null 讓呼叫端用內建字典
  return cached?.aliases ?? null;
}
