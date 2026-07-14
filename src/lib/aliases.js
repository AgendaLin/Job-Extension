// 正式名片段 → PTT 慣用綽號。
// 104 只給正式全名（如「台灣積體電路製造股份有限公司」），但論壇用綽號（「台積電」）。
// 有些綽號是縮寫，無法從正式名以規則推得，只能人工對照。這份表逐步擴充。
// 判斷方式：公司名「包含」match 片段就補上對應綽號當額外搜尋詞。
// match 片段要夠specific，避免誤命中不同公司。
export const COMPANY_ALIASES = [
  // 半導體 / 電子
  { match: "台灣積體電路", nicknames: ["台積電"] },
  { match: "聯華電子", nicknames: ["聯電"] },
  { match: "鴻海精密", nicknames: ["鴻海"] },
  { match: "聯發科技", nicknames: ["聯發科"] },
  { match: "台達電子", nicknames: ["台達電"] },
  { match: "光寶科技", nicknames: ["光寶科", "光寶"] },
  { match: "世界先進積體電路", nicknames: ["世界先進"] },
  { match: "南亞科技", nicknames: ["南亞科"] },
  { match: "華邦電子", nicknames: ["華邦電"] },
  { match: "旺宏電子", nicknames: ["旺宏"] },
  { match: "瑞昱半導體", nicknames: ["瑞昱"] },
  { match: "聯詠科技", nicknames: ["聯詠"] },
  { match: "群聯電子", nicknames: ["群聯"] },
  { match: "力晶積成", nicknames: ["力積電"] },
  { match: "台灣基恩斯", nicknames: ["基恩斯"] },
  // 電腦 / 品牌
  { match: "廣達電腦", nicknames: ["廣達"] },
  { match: "仁寶電腦", nicknames: ["仁寶"] },
  { match: "緯創資通", nicknames: ["緯創"] },
  { match: "和碩聯合", nicknames: ["和碩"] },
  { match: "華碩電腦", nicknames: ["華碩"] },
  { match: "技嘉科技", nicknames: ["技嘉"] },
  { match: "微星科技", nicknames: ["微星"] },
  // 面板
  { match: "友達光電", nicknames: ["友達"] },
  { match: "群創光電", nicknames: ["群創"] },
  // 電信
  { match: "台灣大哥大", nicknames: ["台灣大", "台哥大"] },
  { match: "遠傳電信", nicknames: ["遠傳"] },
  // 傳產 / 塑化 / 鋼鐵
  { match: "台灣塑膠工業", nicknames: ["台塑"] },
  { match: "南亞塑膠", nicknames: ["南亞"] },
  { match: "台灣化學纖維", nicknames: ["台化"] },
  { match: "中國鋼鐵", nicknames: ["中鋼"] },
  // 航運
  { match: "長榮海運", nicknames: ["長榮"] },
  { match: "陽明海運", nicknames: ["陽明"] },
  { match: "萬海航運", nicknames: ["萬海"] },
  // 能源 / 民生
  { match: "台灣中油", nicknames: ["中油"] },
  { match: "台灣電力", nicknames: ["台電"] },
  { match: "統一企業", nicknames: ["統一"] },
  // 金融
  { match: "富邦金融控股", nicknames: ["富邦金"] },
  { match: "國泰金融控股", nicknames: ["國泰金"] },
  { match: "中國信託商業銀行", nicknames: ["中國信託", "中信"] },
];

export function aliasNicknames(name) {
  if (typeof name !== "string" || !name) return [];
  const out = [];
  for (const entry of COMPANY_ALIASES) {
    if (name.includes(entry.match)) out.push(...entry.nicknames);
  }
  return out;
}
