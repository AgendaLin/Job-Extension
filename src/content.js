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
    body.innerHTML = `<div class="jfr-empty">PTT 上找不到相關討論</div>`;
    return;
  }
  const byBoard = groupByBoard(results);
  body.innerHTML = "";
  for (const [board, items] of byBoard) {
    const section = document.createElement("div");
    section.className = "jfr-section";
    section.innerHTML = `<div class="jfr-board">PTT / ${escapeHtml(board)}</div>`;
    for (const item of items) {
      const a = document.createElement("a");
      a.className = "jfr-item";
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = item.title;
      section.appendChild(a);
    }
    body.appendChild(section);
  }
}

function renderError(panelEl) {
  panelEl.querySelector(".jfr-body").innerHTML =
    `<div class="jfr-empty">搜尋失敗，請稍後再試</div>`;
}

function groupByBoard(results) {
  const map = new Map();
  for (const r of results) {
    if (!map.has(r.board)) map.set(r.board, []);
    map.get(r.board).push(r);
  }
  return map;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
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
