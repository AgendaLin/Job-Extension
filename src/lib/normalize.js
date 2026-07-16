import { aliasNicknames } from "./aliases.js";

// 組織型態後綴。不只公司，事務所/銀行等型態也要涵蓋——否則像「安永聯合會計師事務所」
// 會整串拿去搜而得到 0 筆（PTT 上大家只講「安永」，實測有 17 筆）。
//
// 順序有意義：比對是「取第一個命中的後綴」，不是取最長的。所以較長／較具體的後綴必須排在
// 它所包含的較短後綴前面。例如「聯合會計師事務所」必須排在「事務所」前面，
// 否則「安永聯合會計師事務所」會先命中「事務所」，切出殘骸「安永聯合會計師」。
// 同理「股份有限公司」必須在「有限公司」前面，否則會留下殘尾「股份」。
const LEGAL_SUFFIXES = [
  // 公司
  "股份有限公司",
  "有限公司",
  "股份公司",
  // 事務所（長→短）
  "聯合會計師事務所",
  "會計師事務所",
  "聯合法律事務所",
  "法律事務所",
  "事務所",
  // 其他組織型態
  "商業銀行",
  "醫療財團法人", // 例：長庚醫療財團法人 → 長庚醫療 → 長庚
  "財團法人",
  "社團法人",
  "企業社",
  "工作室",
  "商行",
];

// 組織型態「前綴」。台灣很多雇主是財團法人／國立機構，型態字擺在前面（財團法人工業技術研究院），
// 只砍後綴會整串搜而得到 0 筆。這些要從頭砍。
const ORG_PREFIXES = ["財團法人", "社團法人", "行政法人", "國立", "私立"];

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

function stripOrgPrefix(name) {
  let core = name;
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of ORG_PREFIXES) {
      if (core.startsWith(p) && core.length > p.length) {
        core = core.slice(p.length).trim();
        changed = true;
        break;
      }
    }
  }
  return core;
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

    // 先砍組織型態前綴（財團法人工業技術研究院 → 工業技術研究院）
    const noPrefix = stripOrgPrefix(seg);
    if (noPrefix !== seg) terms.add(noPrefix);

    // 取組織型態後綴「之前」的核心名。後綴可能夾在中間（例：「中華汽車工業股份有限公司楊梅廠」
    // → 「中華汽車工業」），所以用 indexOf 切斷，而非只判斷結尾。
    const core = stripLegalSuffix(noPrefix);
    if (core !== noPrefix) terms.add(core);

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

// 給「跳去外站搜尋」用的單一最佳詞：最貼近人話的叫法。
// 有綽號用綽號（台積電），否則用中文全名去掉法律後綴（全景軟體），
// 不用剝過行業詞的版本（「全景」太短，人工搜尋反而不精準）。
export function primarySearchTerm(raw) {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const nicks = aliasNicknames(trimmed);
  if (nicks.length) return nicks[0];

  // 104 的「英文品牌_中文全名」格式，中文全名在後段
  const seg = trimmed.split("_").pop().trim();
  return stripLegalSuffix(seg) || seg;
}
