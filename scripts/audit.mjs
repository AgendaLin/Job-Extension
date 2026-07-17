// 稽核腳本（不隨擴充打包，純開發用）。
// 拿一批「已知的真實知名雇主」跑一次：normalize 產生搜尋詞 → 去 PTT 數各板筆數，
// 標出「明明是知名公司卻幾乎 0 筆」的——那多半代表綽號沒收錄、或組織型態沒處理到。
//
// 腳本能做的到此為止（找出可疑者）。至於「它在 PTT 上到底叫什麼」需要人/LLM 判斷，
// 判斷出候選綽號後可以再用本腳本的 hits() 驗證。
//
// 用法：node scripts/audit.mjs

import { normalizeCompanyName } from "../src/lib/normalize.js";
import { boardsForIndustry } from "../src/lib/boards.js";

// [公司正式名, 104 產業類別] —— 種子清單是「人的知識」，刻意偏非理工/法人機構
const SEEDS = [
  ["安永聯合會計師事務所", "會計服務業"],
  ["勤業眾信聯合會計師事務所", "會計服務業"],
  ["台灣國際商業機器股份有限公司", "電腦系統整合服務業"],
  ["台灣微軟股份有限公司", "電腦軟體服務業"],
  ["奧美廣告股份有限公司", "廣告行銷公關業"],
  ["李奧貝納股份有限公司", "廣告行銷公關業"],
  ["國泰人壽保險股份有限公司", "人身保險業"],
  ["新光人壽保險股份有限公司", "人身保險業"],
  ["富邦產物保險股份有限公司", "產物保險業"],
  ["中國信託商業銀行股份有限公司", "銀行業"],
  ["玉山商業銀行股份有限公司", "銀行業"],
  ["台新國際商業銀行股份有限公司", "銀行業"],
  ["長榮航空股份有限公司", "民航"],
  ["中華航空股份有限公司", "民航"],
  ["星宇航空股份有限公司", "民航"],
  ["長庚醫療財團法人", "醫院"],
  ["台北榮民總醫院", "醫院"],
  ["馬偕紀念醫院", "醫院"],
  ["台灣電力股份有限公司", "電力供應業"],
  ["台灣中油股份有限公司", "石油煉製業"],
  ["中華郵政股份有限公司", "郵政業"],
  ["財團法人工業技術研究院", "自然科學研發業"],
  ["財團法人資訊工業策進會", "自然科學研發業"],
  ["統一超商股份有限公司", "便利商店"],
  ["全聯實業股份有限公司", "食品什貨、飲料零售業"],
  ["王品餐飲股份有限公司", "餐館業"],
  ["雄獅旅行社股份有限公司", "旅遊服務業"],
  ["聯合報股份有限公司", "新聞出版業"],
  ["三立電視股份有限公司", "電視業"],
  ["誠品股份有限公司", "百貨公司"],
];

const PAGE_RE = /class="title"/g;

async function hits(term, board) {
  const url = `https://www.ptt.cc/bbs/${board}/search?q=${encodeURIComponent(term)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return 0;
    return ((await res.text()).match(PAGE_RE) || []).length;
  } catch {
    return 0;
  }
}

async function auditOne(company, industry) {
  const terms = normalizeCompanyName(company);
  const boards = boardsForIndustry(industry);
  let best = 0;
  for (const t of terms) {
    let total = 0;
    for (const b of boards) total += await hits(t, b);
    best = Math.max(best, total);
  }
  return { company, industry, terms, boards, best };
}

const results = [];
for (const [c, i] of SEEDS) results.push(await auditOne(c, i));

const suspicious = results.filter((r) => r.best < 5).sort((a, b) => a.best - b.best);
const ok = results.filter((r) => r.best >= 5);

console.log(`稽核 ${results.length} 家，OK ${ok.length}，可疑（<5 筆）${suspicious.length}\n`);
console.log("=== 可疑（知名公司卻幾乎沒討論，多半是綽號/型態沒處理）===");
for (const r of suspicious) {
  console.log(`  ${r.best} 筆  ${r.company}`);
  console.log(`        搜尋詞: ${JSON.stringify(r.terms)}`);
  console.log(`        板: ${r.boards.join(",")}`);
}
console.log("\n=== OK（僅列筆數）===");
for (const r of ok.sort((a, b) => b.best - a.best))
  console.log(`  ${String(r.best).padStart(3)} 筆  ${r.company}`);
