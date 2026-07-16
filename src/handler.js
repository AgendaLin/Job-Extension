import { normalizeCompanyName, primarySearchTerm } from "./lib/normalize.js";
import { searchPtt as defaultSearchPtt } from "./lib/ptt.js";
import { isNewsTitle } from "./lib/categorize.js";
import { boardsForIndustry } from "./lib/boards.js";

export function dedupe(results) {
  const seen = new Set();
  const out = [];
  for (const r of results) {
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    out.push(r);
  }
  return out;
}

export async function handleSearch(company, industry, deps = {}) {
  const searchPtt = deps.searchPtt || defaultSearchPtt;
  // 依 104 的產業類別決定要不要加專業板（會計→Accounting、金融→Bank_Service…）
  const boards = deps.boards || boardsForIndustry(industry);

  const terms = normalizeCompanyName(company);
  if (terms.length === 0)
    return { results: [], terms: [], primaryTerm: "", boards };

  const perTerm = await Promise.all(
    terms.map((term) => searchPtt(term, boards))
  );
  // 標記新聞，讓面板把新聞收進獨立一區（見 lib/categorize.js）
  const results = dedupe(perTerm.flat()).map((r) => ({
    ...r,
    isNews: isNewsTitle(r.title),
  }));

  return {
    results,
    terms,
    primaryTerm: primarySearchTerm(company),
    boards, // 回傳實際搜了哪些板，方便從 console 診斷
  };
}
