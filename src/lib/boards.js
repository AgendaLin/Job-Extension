// 依產業選板。
//
// 基本 4 板偏理工（Tech_Job/Soft_Job）＋跨領域（Salary/job）。實測發現非理工的公司
// 討論其實在別的板：資誠/安永在 Accounting 板的文章比基本 4 板加起來還多。
// 但全域每個板都搜會讓請求數暴增（還可能被 PTT 限流），而且對科技公司搜護理板是浪費。
// 所以依 104 頁面上的「產業類別」動態決定要不要加專業板。
//
// 產業字串來源：職缺頁取 JSON-LD 的 industry（例：「光電產業」），
// 公司頁取「產業類別」欄位的值（例：「電腦軟體服務業」）。

export const BASE_BOARDS = ["Tech_Job", "Salary", "Soft_Job", "job"];

// 用關鍵字比對而非完全比對，因為 104 的產業名稱有很多變體
//（會計服務業／記帳及會計服務業／法律及會計服務業…）。
const INDUSTRY_RULES = [
  { keywords: ["會計", "記帳", "審計"], boards: ["Accounting"] },
  { keywords: ["法律"], boards: ["Law"] },
  { keywords: ["銀行", "金融", "證券", "期貨", "信託", "投信", "投顧"], boards: ["Bank_Service"] },
  { keywords: ["保險"], boards: ["Insurance"] },
  { keywords: ["廣告", "行銷", "公關"], boards: ["Marketing"] },
  { keywords: ["傳播", "媒體", "出版", "新聞", "廣播", "電視"], boards: ["media-chaos"] },
];

export function boardsForIndustry(industry) {
  const text = String(industry ?? "");
  if (!text) return BASE_BOARDS;

  const extra = [];
  for (const rule of INDUSTRY_RULES) {
    if (rule.keywords.some((k) => text.includes(k))) {
      for (const b of rule.boards) if (!extra.includes(b)) extra.push(b);
    }
  }
  return extra.length ? [...BASE_BOARDS, ...extra] : BASE_BOARDS;
}
