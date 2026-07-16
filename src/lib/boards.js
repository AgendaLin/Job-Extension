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

// 關鍵字比對自 104 官方產業分類表（static.104.com.tw/category-tool/json/Indust.json，
// 16 大類 / 66 中類 / 284 小類；擴充實際拿到的是小類名稱，例如「光電產業」「會計服務業」）。
// 每個板都先實測過該板真的有雇主討論才收——例如外商板（Foreign_Inv）看似相關，
// 實測外商公司多為 0 筆（KEYENCE 在該板 0 筆、真正的 35 筆在 Tech_Job/Salary），故不收。
const INDUSTRY_RULES = [
  { keywords: ["會計", "記帳", "審計"], boards: ["Accounting"] },
  { keywords: ["法律"], boards: ["Law"] },
  {
    // 涵蓋 104 金融類的各種小類：銀行業／信託投資業／證券及期貨業／金融控股業／
    // 信用合作社業／農漁會信用部／郵政儲金匯兌業／電子支付業／創投業／其他投資理財相關業
    keywords: [
      "銀行", "金融", "證券", "期貨", "信託", "投信", "投顧",
      "信用合作社", "信用部", "儲金", "電子支付", "創投", "投資理財",
    ],
    boards: ["Bank_Service"],
  },
  { keywords: ["保險"], boards: ["Insurance"] },
  { keywords: ["廣告", "行銷", "公關"], boards: ["Marketing"] },
  { keywords: ["傳播", "媒體", "出版", "新聞", "廣播", "電視"], boards: ["media-chaos"] },
  // 實測：長庚/台大醫院/馬偕/榮總 在護理板各 20 筆（滿頁）
  { keywords: ["醫院", "診所", "醫療保健"], boards: ["Nurse"] },
  // 實測：補習班/康橋/私立 在教師板各 20 筆
  { keywords: ["教育事業", "補習班", "安親", "才藝班", "學校"], boards: ["Teacher"] },
  // 實測：長榮航空/華航/星宇 在航空板各 20 筆
  { keywords: ["民航", "航空"], boards: ["Aviation"] },
  // 實測：建築師事務所 20 筆，但營造廠（大陸工程 1、潤泰 0）幾乎沒有，所以只收設計／事務所類。
  // 關鍵字不能只寫「建築」——會誤中「金屬結構及建築組件製造業」這種製造業。
  {
    keywords: ["建築及工程技術服務", "室內設計", "專門設計"],
    boards: ["Architecture"],
  },
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
