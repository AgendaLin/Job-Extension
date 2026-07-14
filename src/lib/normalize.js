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

  let stripped = full;
  for (const suffix of LEGAL_SUFFIXES) {
    if (stripped.endsWith(suffix)) {
      stripped = stripped.slice(0, -suffix.length).trim();
      break;
    }
  }
  if (stripped && stripped !== full) terms.add(stripped);

  return [...terms];
}
