// 順序有意義：較長／較具體的後綴（如「股份有限公司」）必須排在它所包含的較短後綴（如「有限公司」）前面，否則會先剝掉短的、留下殘尾「股份」。
const LEGAL_SUFFIXES = [
  "股份有限公司",
  "有限公司",
  "股份公司",
  "企業社",
  "工作室",
  "商行",
];

export function normalizeCompanyName(raw) {
  if (typeof raw !== "string") return [];
  const full = raw.trim();
  if (!full) return [];

  const terms = new Set([full]);

  // 取法律後綴「之前」的核心名。後綴可能夾在中間（例：「中華汽車工業股份有限公司楊梅廠」
  // → 「中華汽車工業」），所以用 indexOf 切斷，而非只判斷結尾。
  for (const suffix of LEGAL_SUFFIXES) {
    const idx = full.indexOf(suffix);
    if (idx > 0) {
      const core = full.slice(0, idx).trim();
      if (core) terms.add(core);
      break;
    }
  }

  return [...terms];
}
