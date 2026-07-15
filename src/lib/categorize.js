// PTT 標題有固定的分類標籤慣例：[新聞]、[心得]、[請益]、[討論]…
// 上市公司的 [新聞] 多半是股價、訴訟、產業動向，跟「這家公司好不好待」關聯低，
// 但量又很大（例：大立光 44 筆有 26 筆是新聞），會淹掉真正有用的求職討論。
// 因此把新聞獨立成一區、預設收合。Re: 開頭的回文屬於同一串，一起歸類。
const NEWS_TITLE_RE = /^(Re:\s*)?\[新聞\]/;

export function isNewsTitle(title) {
  return NEWS_TITLE_RE.test(String(title ?? "").trim());
}
