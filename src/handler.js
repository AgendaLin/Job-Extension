import { normalizeCompanyName } from "./lib/normalize.js";
import { searchPtt as defaultSearchPtt } from "./lib/ptt.js";

export const PTT_BOARDS = ["Tech_Job", "Salary", "Soft_Job"];

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
  if (terms.length === 0) return { results: [] };

  const perTerm = await Promise.all(
    terms.map((term) => searchPtt(term, boards))
  );
  return { results: dedupe(perTerm.flat()) };
}
