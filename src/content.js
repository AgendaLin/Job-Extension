(async function () {
  const company = detectCompanyName();
  if (!company) return;

  const panel = createPanel(company);
  document.body.appendChild(panel);

  try {
    const resp = await chrome.runtime.sendMessage({
      type: "SEARCH_FORUMS",
      company,
    });
    renderResults(panel, resp?.results || []);
  } catch (err) {
    console.error("[content] search failed", err);
    renderError(panel);
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
})();
