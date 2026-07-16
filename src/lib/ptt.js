const PTT_BASE = "https://www.ptt.cc";

// PTT 搜尋一頁固定 20 筆。滿頁代表可能還有更多，才值得再抓下一頁；
// 沒滿就停，不浪費請求。上限 3 頁（60 筆）——再多對「看風評」也沒有邊際價值，
// 而且請求數會隨 搜尋詞 × 板 × 頁 相乘，太多容易被 PTT 限流。
const PAGE_SIZE = 20;
const MAX_PAGES = 3;

export function buildPttSearchUrl(board, term, page = 1) {
  const url = `${PTT_BASE}/bbs/${encodeURIComponent(board)}/search?q=${encodeURIComponent(
    term
  )}`;
  return page > 1 ? `${url}&page=${page}` : url;
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

async function searchBoard(term, board, fetchFn) {
  const results = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetchFn(buildPttSearchUrl(board, term, page));
    if (!res.ok) break;
    const items = parsePttSearchHtml(await res.text(), board);
    results.push(...items);
    if (items.length < PAGE_SIZE) break; // 沒滿頁 = 沒有下一頁了
  }
  return results;
}

export async function searchPtt(term, boards, fetchFn = fetch) {
  const perBoard = await Promise.all(
    boards.map(async (board) => {
      try {
        return await searchBoard(term, board, fetchFn);
      } catch (err) {
        console.error("[PTT] fetch failed", board, term, err);
        return [];
      }
    })
  );
  return perBoard.flat();
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
