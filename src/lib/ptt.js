const PTT_BASE = "https://www.ptt.cc";

export function buildPttSearchUrl(board, term) {
  return `${PTT_BASE}/bbs/${encodeURIComponent(board)}/search?q=${encodeURIComponent(
    term
  )}`;
}

export function parsePttSearchHtml(html, board) {
  if (typeof html !== "string" || !html) return [];
  const results = [];
  const titleBlockRe = /<div class="title">([\s\S]*?)<\/div>/g;
  let block;
  while ((block = titleBlockRe.exec(html)) !== null) {
    const linkMatch = /<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(block[1]);
    if (!linkMatch) continue; // 已刪除文章沒有 <a>
    const href = linkMatch[1];
    results.push({
      title: decodeEntities(linkMatch[2].trim()),
      board,
      url: href.startsWith("http") ? href : PTT_BASE + href,
    });
  }
  return results;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
