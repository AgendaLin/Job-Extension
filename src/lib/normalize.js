import { aliasNicknames } from "./aliases.js";

// 順序有意義：較長／較具體的後綴（如「股份有限公司」）必須排在它所包含的較短後綴（如「有限公司」）前面，否則會先剝掉短的、留下殘尾「股份」。
const LEGAL_SUFFIXES = [
  "股份有限公司",
  "有限公司",
  "股份公司",
  "企業社",
  "工作室",
  "商行",
];

// 行業類別詞：接在品牌後面的類型字。剝掉可得更接近 PTT 叫法的核心名
// （克勞德科技 → 克勞德）。PTT 搜尋是「標題包含」，搜較短的詞只會多撈不會漏。
const INDUSTRY_WORDS = [
  "科技", "資訊", "國際", "實業", "企業", "工業", "電子", "精密", "半導體",
  "光電", "生技", "生物", "材料", "化學", "化工", "製藥", "製造", "開發",
  "建設", "投資", "控股", "顧問", "事業", "食品", "電機", "機械", "網路",
  "數位", "軟體", "系統", "服務", "行銷", "傳媒", "娛樂", "文化", "教育",
  "醫療", "能源", "綠能", "營造", "貿易", "物流", "金融", "銀行", "保險",
  "證券", "通訊", "生醫",
];

// 剝到這些爛大街的通用詞就不加，否則撞名會撈進一堆不相干的文章。
const GENERIC_CORES = new Set([
  "台灣", "臺灣", "中華", "中國", "全球", "世界", "亞洲", "大中華",
]);

function stripLegalSuffix(name) {
  for (const suffix of LEGAL_SUFFIXES) {
    const idx = name.indexOf(suffix);
    if (idx > 0) return name.slice(0, idx).trim();
  }
  return name;
}

function stripIndustryWords(name) {
  let core = name;
  let changed = true;
  while (changed) {
    changed = false;
    for (const w of INDUSTRY_WORDS) {
      if (core.length > w.length && core.endsWith(w)) {
        core = core.slice(0, -w.length);
        changed = true;
        break;
      }
    }
  }
  return core;
}

export function normalizeCompanyName(raw) {
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // 104 的公司名常是「英文品牌_中文全名」（例：「KEYENCE_台灣基恩斯股份有限公司」）。
  // 底線黏著的整串在 PTT 搜不到，拆開分別當搜尋詞。
  const segments = trimmed.split("_").map((s) => s.trim()).filter(Boolean);

  const terms = new Set();
  for (const seg of segments) {
    terms.add(seg);

    // 取法律後綴「之前」的核心名。後綴可能夾在中間（例：「中華汽車工業股份有限公司楊梅廠」
    // → 「中華汽車工業」），所以用 indexOf 切斷，而非只判斷結尾。
    const core = stripLegalSuffix(seg);
    if (core !== seg) terms.add(core);

    // 再剝行業類別詞得到更短的核心名（克勞德科技 → 克勞德）。
    // 防護：縮完至少 2 字，且不能是通用詞，避免撞名撈到大量雜訊。
    const short = stripIndustryWords(core);
    if (short !== core && short.length >= 2 && !GENERIC_CORES.has(short)) {
      terms.add(short);
    }
  }

  // 補上人工對照的綽號（例：台灣積體電路製造 → 台積電），正式名在 PTT 搜不到時的關鍵。
  for (const nick of aliasNicknames(trimmed)) terms.add(nick);

  return [...terms];
}
