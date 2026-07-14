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
