// 104 是 SPA：點職缺是前端換頁、不會重新載入，content script 只會在硬載入跑一次。
// 因此這裡自己監看網址變化（pushState/replaceState/popstate + 輪詢兜底）在每次換頁重跑，
// 並且因為 JSON-LD 常是 JS 事後才注入，偵測不到公司名時會重試幾次再放棄。

let lastUrl = null;

function run() {
  if (location.href === lastUrl) return;
  lastUrl = location.href;
  removePanel();
  if (!/^\/(job|company)\//.test(location.pathname)) return;
  detectWithRetry(0);
}

function detectWithRetry(attempt) {
  const company = detectCompanyName();
  if (company) {
    showPanel(company);
    return;
  }
  if (attempt < 12) {
    // JSON-LD/DOM 可能還沒好，最多等約 4.8 秒
    setTimeout(() => {
      if (location.href === lastUrl) detectWithRetry(attempt + 1);
    }, 400);
  } else {
    console.info("[求職論壇風評] 這頁抓不到公司名，不顯示面板");
  }
}

async function showPanel(company) {
  const panel = createPanel(company);
  document.body.appendChild(panel);
  try {
    const resp = await chrome.runtime.sendMessage({
      type: "SEARCH_FORUMS",
      company,
    });
    if (panel !== document.getElementById("jfr-panel")) return; // 期間又換頁了
    const results = resp?.results || [];
    console.info(
      "[求職論壇風評] 偵測公司:",
      company,
      "｜搜尋詞:",
      resp?.terms,
      "｜結果:",
      results.length,
      "筆"
    );
    renderResults(panel, results);
    renderExternalLinks(panel, resp?.primaryTerm);
  } catch (err) {
    console.error("[求職論壇風評] 搜尋失敗:", err);
    renderError(panel);
  }
}

function removePanel() {
  document.getElementById("jfr-panel")?.remove();
}

function detectCompanyName() {
  // 1) 職缺頁：JSON-LD JobPosting.hiringOrganization.name（實測最穩）
  for (const el of document.querySelectorAll(
    'script[type="application/ld+json"]'
  )) {
    let data;
    try {
      data = JSON.parse(el.textContent);
    } catch {
      continue;
    }
    const nodes = Array.isArray(data) ? data : [data];
    for (const node of nodes) {
      const name = node?.hiringOrganization?.name;
      if (name) return String(name).trim();
    }
  }
  // 2) 公司頁（/company/…）：標題 h1 即公司名
  if (location.pathname.startsWith("/company/")) {
    const text = document.querySelector("h1")?.textContent?.trim();
    if (text) return text;
  }
  return null;
}

function createPanel(companyName) {
  const el = document.createElement("div");
  el.id = "jfr-panel";
  el.innerHTML = `
    <div class="jfr-header">
      <span class="jfr-title">論壇風評</span>
      <span class="jfr-company"></span>
      <button class="jfr-toggle" aria-label="收合">–</button>
    </div>
    <div class="jfr-links"></div>
    <div class="jfr-body"><div class="jfr-loading">搜尋中…</div></div>
  `;
  el.querySelector(".jfr-company").textContent = companyName;
  el.querySelector(".jfr-toggle").addEventListener("click", () => {
    el.classList.toggle("jfr-collapsed");
  });
  return el;
}

function renderResults(panelEl, results) {
  const body = panelEl.querySelector(".jfr-body");
  panelEl.querySelector(".jfr-title").textContent = `論壇風評 (${results.length})`;
  if (results.length === 0) {
    // 公司名比對規則一定有漏網之魚（沒收錄綽號、少見的組織型態…），
    // 這時導向上方的 Google／Dcard 按鈕——它們的比對能力比我們的規則好。
    body.innerHTML = `<div class="jfr-empty">PTT 上沒找到相關討論。<br>可能是這家討論本來就少，或公司名沒比對到——<br>試試上面的 Google／Dcard 搜尋。</div>`;
    return;
  }
  body.replaceChildren();

  // 先抽走新聞（不分板、預設收合），剩下的才照板分組
  const news = results.filter((r) => r.isNews);
  const rest = results.filter((r) => !r.isNews);

  if (news.length) body.appendChild(buildNewsSection(news));
  for (const [board, items] of groupByBoard(rest)) {
    body.appendChild(buildBoardSection(board, items));
  }
}

function buildNewsSection(items) {
  const section = document.createElement("div");
  section.className = "jfr-section jfr-news jfr-news-collapsed";

  const head = document.createElement("button");
  head.className = "jfr-news-head";
  const caret = document.createElement("span");
  caret.className = "jfr-caret";
  caret.textContent = "▸";
  head.append(caret, document.createTextNode(` 新聞 (${items.length})`));
  head.addEventListener("click", () => {
    const collapsed = section.classList.toggle("jfr-news-collapsed");
    caret.textContent = collapsed ? "▸" : "▾";
  });

  const list = document.createElement("div");
  list.className = "jfr-news-list";
  for (const item of items) list.appendChild(buildItem(item));

  section.append(head, list);
  return section;
}

function buildBoardSection(board, items) {
  const section = document.createElement("div");
  section.className = "jfr-section";
  const label = document.createElement("div");
  label.className = "jfr-board";
  label.textContent = `PTT / ${board}`;
  section.appendChild(label);
  for (const item of items) section.appendChild(buildItem(item));
  return section;
}

function buildItem(item) {
  const a = document.createElement("a");
  a.className = "jfr-item";
  a.href = item.url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = item.title;
  return a;
}

function renderError(panelEl) {
  panelEl.querySelector(".jfr-body").innerHTML =
    `<div class="jfr-empty">搜尋失敗，請稍後再試</div>`;
}

// 外站搜尋連結。Dcard 的 API 從擴充背景抓會被 Cloudflare 擋（Stage 2 實測 403），
// 所以不內嵌，改成一鍵開對方站內搜尋——不抓取、不需要對方網域權限、不會被擋。
const EXTERNAL_SITES = [
  {
    label: "Dcard 搜尋",
    query: (t) => t, // Dcard 站內搜尋，公司名就夠
    url: (q) => `https://www.dcard.tw/search?query=${encodeURIComponent(q)}`,
  },
  {
    label: "Google 搜尋",
    query: (t) => `${t} 評價`, // Google 全網搜尋，補「評價」才問得到風評
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
];

function renderExternalLinks(panelEl, term) {
  const bar = panelEl.querySelector(".jfr-links");
  if (!bar || !term) return;
  const links = EXTERNAL_SITES.map((site) => {
    const query = site.query(term);
    const a = document.createElement("a");
    a.className = "jfr-ext-link";
    a.href = site.url(query);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = site.label;
    a.title = `以「${query}」搜尋`;
    return a;
  });
  bar.replaceChildren(...links);
}

function groupByBoard(results) {
  const map = new Map();
  for (const r of results) {
    if (!map.has(r.board)) map.set(r.board, []);
    map.get(r.board).push(r);
  }
  return map;
}

// 初次執行 + 監看 SPA 換頁
run();
for (const fn of ["pushState", "replaceState"]) {
  const orig = history[fn];
  history[fn] = function () {
    const ret = orig.apply(this, arguments);
    setTimeout(run, 0);
    return ret;
  };
}
window.addEventListener("popstate", run);
setInterval(run, 1000); // 兜底：事件沒抓到時，靠輪詢偵測網址變化
