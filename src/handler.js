import { normalizeCompanyName, primarySearchTerm } from "./lib/normalize.js";
import { searchPtt as defaultSearchPtt } from "./lib/ptt.js";
import { isNewsTitle } from "./lib/categorize.js";

// Tech_Job/Soft_Job 偏理工，Salary 跨領域，job 是通用求職板（含文組/非理工）。
export const PTT_BOARDS = ["Tech_Job", "Salary", "Soft_Job", "job"];

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

export async function handleSearch(company, deps = {}) {
  const searchPtt = deps.searchPtt || defaultSearchPtt;
  const boards = deps.boards || PTT_BOARDS;

  const terms = normalizeCompanyName(company);
  if (terms.length === 0) return { results: [], terms: [], primaryTerm: "" };

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
  };
}
