# Stage 1 Implementation Plan — 104 公司偵測 + PTT 抓取 + 面板顯示

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出一個可載入的 Manifest V3 Chrome 擴充：在 104 職缺／公司頁自動偵測公司名，去 PTT（Tech_Job / Salary / Soft_Job）搜尋，把相關文章的標題＋連結列在頁面右側浮動面板，點擊新分頁跳原文。

**Architecture:** 路線 A（純前端，無後端）。content script 負責在 104 頁面「偵測公司名 + 渲染面板」；background service worker（ES module）負責「正規化公司名 + fetch PTT + 解析 + 去重」，透過 `chrome.runtime` 訊息與 content script 溝通。所有可純函數化的邏輯抽到 `src/lib/` 與 `src/handler.js`，用 Node 內建測試框架 TDD；DOM/UI 部分手動在真 104 頁驗證。

**Tech Stack:** Manifest V3、原生 JavaScript（ES modules，零 build 工具、零 npm 依賴）、Node.js `node --test` + `node:assert`（僅測試用）。需 Node.js ≥ 20。

---

## 檔案結構

```
Job-Extension/
├── manifest.json            # MV3 設定
├── package.json             # 只為了 `npm test` → node --test；無 dependencies
├── .gitignore
├── src/
│   ├── background.js        # 薄層：chrome.runtime 訊息接線（手動驗證）
│   ├── handler.js           # handleSearch / dedupe（可測）
│   ├── content.js           # 104 頁：偵測公司名 + 渲染面板（手動驗證）
│   ├── panel.css            # 面板樣式
│   └── lib/
│       ├── normalize.js     # normalizeCompanyName（純函數，可測）
│       └── ptt.js           # buildPttSearchUrl / parsePttSearchHtml / searchPtt（可測）
├── test/
│   ├── normalize.test.js
│   ├── ptt.test.js
│   └── handler.test.js
└── docs/
    ├── spec.md
    └── plan-stage1.md
```

**責任邊界**
- `lib/normalize.js`、`lib/ptt.js`、`handler.js`：純邏輯，Node 可直接 import 測試，也被 background 匯入。
- `background.js`：只做 `chrome.runtime.onMessage` 接線，呼叫 `handler.js`。薄到不需單元測試。
- `content.js`：只做 DOM 讀取（偵測公司名）與 DOM 渲染（面板）。不 import 任何 lib（content script 靜態宣告不支援 ES module import），所有邏輯都在 background 端。

**為什麼用 regex 解析 PTT HTML 而不是 DOMParser**：MV3 background service worker 沒有 DOM 環境（無 `DOMParser`），且我們零依賴不裝 jsdom，所以對 PTT 這種結構穩定的頁面用 regex 抽取。

---

## Task 1: 專案骨架（scaffold）

**Files:**
- Create: `package.json`
- Create: `manifest.json`
- Create: `.gitignore`
- Create: `src/lib/` `src/` `test/` 資料夾（由建檔自然產生）

- [ ] **Step 1: 建 `package.json`**

```json
{
  "name": "job-forum-extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: 建 `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "求職論壇風評",
  "version": "0.1.0",
  "description": "在 104 職缺頁彙整 PTT 論壇上的公司討論。",
  "host_permissions": [
    "*://*.ptt.cc/*"
  ],
  "background": {
    "service_worker": "src/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["*://www.104.com.tw/job/*", "*://www.104.com.tw/company/*"],
      "js": ["src/content.js"],
      "css": ["src/panel.css"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 3: 建 `.gitignore`**

```
node_modules/
*.log
.DS_Store
```

- [ ] **Step 4: Commit**

```bash
git add package.json manifest.json .gitignore
git commit -m "chore: scaffold MV3 extension project"
```

---

## Task 2: 公司名正規化器（TDD）

**Files:**
- Test: `test/normalize.test.js`
- Create: `src/lib/normalize.js`

- [ ] **Step 1: 寫失敗測試 `test/normalize.test.js`**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCompanyName } from "../src/lib/normalize.js";

test("保留全名並補上去後綴的短名", () => {
  assert.deepEqual(
    normalizeCompanyName("台灣積體電路製造股份有限公司"),
    ["台灣積體電路製造股份有限公司", "台灣積體電路製造"]
  );
});

test("有限公司也會被去掉", () => {
  assert.deepEqual(
    normalizeCompanyName("愛卡拉互動媒體有限公司"),
    ["愛卡拉互動媒體有限公司", "愛卡拉互動媒體"]
  );
});

test("沒有法律後綴時只回全名", () => {
  assert.deepEqual(normalizeCompanyName("Google Taiwan"), ["Google Taiwan"]);
});

test("前後空白會被 trim", () => {
  assert.deepEqual(normalizeCompanyName("  聯發科技股份有限公司 "), [
    "聯發科技股份有限公司",
    "聯發科技",
  ]);
});

test("空字串或非字串回空陣列", () => {
  assert.deepEqual(normalizeCompanyName(""), []);
  assert.deepEqual(normalizeCompanyName(null), []);
  assert.deepEqual(normalizeCompanyName(undefined), []);
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `node --test test/normalize.test.js`
Expected: FAIL（`Cannot find module '../src/lib/normalize.js'` 或 `normalizeCompanyName is not a function`）

- [ ] **Step 3: 實作 `src/lib/normalize.js`**

```js
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
```

- [ ] **Step 4: 執行測試確認通過**

Run: `node --test test/normalize.test.js`
Expected: PASS（5 tests pass）

- [ ] **Step 5: Commit**

```bash
git add test/normalize.test.js src/lib/normalize.js
git commit -m "feat: add company name normalizer"
```

---

## Task 3: PTT 搜尋網址與 HTML 解析（TDD）

**Files:**
- Test: `test/ptt.test.js`
- Create: `src/lib/ptt.js`

- [ ] **Step 1: 寫失敗測試 `test/ptt.test.js`**

以貼近真實 PTT 搜尋結果的合成 HTML 當 fixture（含一則已刪除文章、含 HTML entity），對 `buildPttSearchUrl` 與 `parsePttSearchHtml` 斷言。

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildPttSearchUrl, parsePttSearchHtml } from "../src/lib/ptt.js";

test("buildPttSearchUrl 會 encode 中文與板名", () => {
  const url = buildPttSearchUrl("Tech_Job", "台積電");
  assert.equal(
    url,
    "https://www.ptt.cc/bbs/Tech_Job/search?q=%E5%8F%B0%E7%A9%8D%E9%9B%BB"
  );
});

const SAMPLE_HTML = `
<div class="r-list-container action-bar-margin bbs-screen">
  <div class="r-ent">
    <div class="nrec"><span class="hl f2">10</span></div>
    <div class="title">
      <a href="/bbs/Tech_Job/M.1783562740.A.9DF.html">[新聞] 劍指台積電！日大廠放話不能輸 &amp; 超殺代工</a>
    </div>
  </div>
  <div class="r-ent">
    <div class="title">
      (本文已被刪除) [tsmc]
    </div>
  </div>
  <div class="r-ent">
    <div class="title">
      <a href="/bbs/Tech_Job/M.1783828966.A.2EA.html">Re: [討論] 進台積電有經歷嗎</a>
    </div>
  </div>
</div>
`;

test("parsePttSearchHtml 抽出標題與絕對網址", () => {
  const results = parsePttSearchHtml(SAMPLE_HTML, "Tech_Job");
  assert.equal(results.length, 2); // 已刪除那則被略過
  assert.deepEqual(results[0], {
    title: "[新聞] 劍指台積電！日大廠放話不能輸 & 超殺代工", // entity 被還原
    board: "Tech_Job",
    url: "https://www.ptt.cc/bbs/Tech_Job/M.1783562740.A.9DF.html",
  });
  assert.equal(results[1].title, "Re: [討論] 進台積電有經歷嗎");
});

test("空 HTML 回空陣列", () => {
  assert.deepEqual(parsePttSearchHtml("", "Salary"), []);
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `node --test test/ptt.test.js`
Expected: FAIL（`Cannot find module '../src/lib/ptt.js'`）

- [ ] **Step 3: 實作 `src/lib/ptt.js`（先只做 build + parse，searchPtt 下一個 Task 補）**

```js
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
```

- [ ] **Step 4: 執行測試確認通過**

Run: `node --test test/ptt.test.js`
Expected: PASS（3 tests pass）

- [ ] **Step 5: 手動比對真實結構（非自動測試，確認合成 fixture 沒失真）**

Run:
```bash
curl -s "https://www.ptt.cc/bbs/Tech_Job/search?q=%E5%8F%B0%E7%A9%8D%E9%9B%BB" | grep -o '<div class="title">' | head
```
Expected: 看到多個 `<div class="title">`，代表真實頁面結構與 fixture 假設一致。若結構已變，回頭調整 `parsePttSearchHtml` 與測試 fixture。

- [ ] **Step 6: Commit**

```bash
git add test/ptt.test.js src/lib/ptt.js
git commit -m "feat: add PTT search url builder and html parser"
```

---

## Task 4: PTT 多板搜尋 searchPtt（TDD，可注入 fetch）

**Files:**
- Modify: `src/lib/ptt.js`（新增 `searchPtt`）
- Modify: `test/ptt.test.js`（新增 searchPtt 測試）

- [ ] **Step 1: 在 `test/ptt.test.js` 末尾新增失敗測試**

用假的 `fetchFn` 避免真連網；驗證多板結果會被合併。

```js
import { searchPtt } from "../src/lib/ptt.js";

test("searchPtt 合併多個板的結果，忽略失敗的板", async () => {
  const fakeFetch = async (url) => {
    if (url.includes("Tech_Job")) {
      return {
        ok: true,
        text: async () =>
          `<div class="title"><a href="/bbs/Tech_Job/M.1.A.html">台積電甲</a></div>`,
      };
    }
    if (url.includes("Salary")) {
      return {
        ok: true,
        text: async () =>
          `<div class="title"><a href="/bbs/Salary/M.2.A.html">台積電乙</a></div>`,
      };
    }
    return { ok: false, text: async () => "" }; // 例如某板不存在
  };

  const results = await searchPtt("台積電", ["Tech_Job", "Salary", "Broken"], fakeFetch);
  const urls = results.map((r) => r.url).sort();
  assert.deepEqual(urls, [
    "https://www.ptt.cc/bbs/Salary/M.2.A.html",
    "https://www.ptt.cc/bbs/Tech_Job/M.1.A.html",
  ]);
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `node --test test/ptt.test.js`
Expected: FAIL（`searchPtt is not a function`）

- [ ] **Step 3: 在 `src/lib/ptt.js` 新增 `searchPtt`**

```js
export async function searchPtt(term, boards, fetchFn = fetch) {
  const perBoard = await Promise.all(
    boards.map(async (board) => {
      try {
        const res = await fetchFn(buildPttSearchUrl(board, term));
        if (!res.ok) return [];
        return parsePttSearchHtml(await res.text(), board);
      } catch (err) {
        console.error("[PTT] fetch failed", board, term, err);
        return [];
      }
    })
  );
  return perBoard.flat();
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `node --test test/ptt.test.js`
Expected: PASS（4 tests pass）

- [ ] **Step 5: Commit**

```bash
git add test/ptt.test.js src/lib/ptt.js
git commit -m "feat: add multi-board PTT search with injectable fetch"
```

---

## Task 5: 搜尋協調器 handleSearch + 去重（TDD）

**Files:**
- Test: `test/handler.test.js`
- Create: `src/handler.js`

- [ ] **Step 1: 寫失敗測試 `test/handler.test.js`**

用注入的假 `searchPtt` 驗證：多個搜尋詞的結果會合併並依 url 去重。

```js
import test from "node:test";
import assert from "node:assert/strict";
import { handleSearch, dedupe } from "../src/handler.js";

test("dedupe 依 url 去除重複", () => {
  const input = [
    { title: "a", board: "Tech_Job", url: "u1" },
    { title: "a 重複", board: "Tech_Job", url: "u1" },
    { title: "b", board: "Salary", url: "u2" },
  ];
  assert.deepEqual(dedupe(input), [
    { title: "a", board: "Tech_Job", url: "u1" },
    { title: "b", board: "Salary", url: "u2" },
  ]);
});

test("handleSearch 正規化公司名、跨搜尋詞合併並去重", async () => {
  const calls = [];
  const fakeSearchPtt = async (term) => {
    calls.push(term);
    // 全名與短名各回一筆，其中一筆 url 相同以驗證去重
    if (term === "台灣積體電路製造股份有限公司")
      return [{ title: "全名文", board: "Tech_Job", url: "shared" }];
    if (term === "台灣積體電路製造")
      return [
        { title: "短名文", board: "Salary", url: "unique" },
        { title: "重複文", board: "Tech_Job", url: "shared" },
      ];
    return [];
  };

  const { results } = await handleSearch("台灣積體電路製造股份有限公司", {
    searchPtt: fakeSearchPtt,
    boards: ["Tech_Job"],
  });

  assert.deepEqual(calls, [
    "台灣積體電路製造股份有限公司",
    "台灣積體電路製造",
  ]);
  assert.equal(results.length, 2); // shared 去重後只剩一筆
  assert.deepEqual(results.map((r) => r.url).sort(), ["shared", "unique"]);
});

test("handleSearch 對空公司名回空結果", async () => {
  const { results } = await handleSearch("", { searchPtt: async () => [] });
  assert.deepEqual(results, []);
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `node --test test/handler.test.js`
Expected: FAIL（`Cannot find module '../src/handler.js'`）

- [ ] **Step 3: 實作 `src/handler.js`**

```js
import { normalizeCompanyName } from "./lib/normalize.js";
import { searchPtt as defaultSearchPtt } from "./lib/ptt.js";

export const PTT_BOARDS = ["Tech_Job", "Salary", "Soft_Job"];

export function dedupe(results) {
  const seen = new Set();
  const out = [];
  for (const r of results) {
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    out.push(r);
  }
  return out;
}

export async function handleSearch(company, deps = {}) {
  const searchPtt = deps.searchPtt || defaultSearchPtt;
  const boards = deps.boards || PTT_BOARDS;

  const terms = normalizeCompanyName(company);
  if (terms.length === 0) return { results: [] };

  const collected = [];
  for (const term of terms) {
    collected.push(...(await searchPtt(term, boards)));
  }
  return { results: dedupe(collected) };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `node --test test/handler.test.js`
Expected: PASS（3 tests pass）

- [ ] **Step 5: 執行全部測試確認整體綠燈**

Run: `node --test`
Expected: PASS（normalize 5 + ptt 4 + handler 3 = 12 tests pass）

- [ ] **Step 6: Commit**

```bash
git add test/handler.test.js src/handler.js
git commit -m "feat: add search handler with cross-term dedupe"
```

---

## Task 6: Background service worker 接線（薄層，手動驗證）

**Files:**
- Create: `src/background.js`

- [ ] **Step 1: 實作 `src/background.js`**

```js
import { handleSearch } from "./handler.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SEARCH_FORUMS") {
    handleSearch(message.company)
      .then(sendResponse)
      .catch((err) => {
        console.error("[background] handleSearch failed", err);
        sendResponse({ results: [] });
      });
    return true; // 保持訊息通道開啟以支援非同步回覆
  }
  return false;
});
```

- [ ] **Step 2: 手動驗證 service worker 能載入且能抓 PTT**

1. 開 `chrome://extensions` → 開啟「開發人員模式」→「載入未封裝項目」→ 選專案根目錄。
2. 點該擴充的「Service Worker」連結開啟 DevTools console。
3. 在 console 貼上：
```js
chrome.runtime.sendMessage({ type: "SEARCH_FORUMS", company: "台灣積體電路製造股份有限公司" }, (r) => console.log(r));
```
Expected: 印出 `{ results: [...] }`，results 內有多筆 `{title, board, url}`，url 以 `https://www.ptt.cc/bbs/` 開頭。

- [ ] **Step 3: Commit**

```bash
git add src/background.js
git commit -m "feat: wire background message handler for forum search"
```

---

## Task 7: Content script — 偵測公司名 + 渲染面板（手動驗證）

**Files:**
- Create: `src/content.js`
- Create: `src/panel.css`

- [ ] **Step 1: 偵察真實 104 頁面（recon，產出 detect 需要的事實）**

在 Chrome 開一個真實 104 職缺頁（例如任一台積電職缺），開 DevTools console 執行：

```js
// (a) 檢查是否有 JSON-LD JobPosting，含 hiringOrganization.name
JSON.stringify(
  [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((s) => { try { return JSON.parse(s.textContent); } catch { return null; } }),
  null, 2
);
```
記錄：是否存在 `hiringOrganization.name`（或 `@type: "Organization"` 的 `name`）。

```js
// (b) 若 JSON-LD 沒有公司名，找出頁面上顯示公司名的元素，記下可用的 selector
//     （在職缺頁點公司名連結通常導向 /company/...，可用此特徵定位）
[...document.querySelectorAll('a[href*="/company/"]')].map((a) => ({
  text: a.textContent.trim(),
  cls: a.className,
})).slice(0, 5);
```
把 (a)(b) 的實際結果記在 commit message 或 `docs/spec.md` 附註，作為下一步實作依據。

- [ ] **Step 2: 實作 `src/content.js`**

以 JSON-LD 為主要來源；DOM fallback 使用 recon 步驟 (b) 確認的 `a[href*="/company/"]`。若 recon 發現 104 的實際結構不同，依實測結果調整 `detectCompanyName` 的 fallback 選擇器。

```js
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
    // 1) JSON-LD（最穩定）
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
        const name =
          node?.hiringOrganization?.name ||
          (node?.["@type"] === "Organization" ? node?.name : null);
        if (name) return String(name).trim();
      }
    }
    // 2) DOM fallback：指向 /company/ 的連結文字（recon 步驟確認）
    const link = document.querySelector('a[href*="/company/"]');
    const text = link?.textContent?.trim();
    return text || null;
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
```

- [ ] **Step 3: 實作 `src/panel.css`**

```css
#jfr-panel {
  position: fixed;
  top: 96px;
  right: 16px;
  width: 320px;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 2147483647;
  font-family: -apple-system, "Segoe UI", "Microsoft JhengHei", sans-serif;
  font-size: 13px;
  color: #1a1a1a;
}
#jfr-panel .jfr-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
}
#jfr-panel .jfr-title { font-weight: 700; }
#jfr-panel .jfr-company {
  flex: 1;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#jfr-panel .jfr-toggle {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: #666;
}
#jfr-panel .jfr-body { overflow-y: auto; padding: 4px 0; }
#jfr-panel.jfr-collapsed .jfr-body { display: none; }
#jfr-panel .jfr-board {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 700;
  color: #999;
}
#jfr-panel .jfr-item {
  display: block;
  padding: 6px 12px;
  color: #1a1a1a;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid #f2f2f2;
}
#jfr-panel .jfr-item:hover { background: #f5f8ff; }
#jfr-panel .jfr-loading,
#jfr-panel .jfr-empty {
  padding: 16px 12px;
  color: #999;
  text-align: center;
}
```

- [ ] **Step 4: 手動 E2E 驗證**

1. `chrome://extensions` →「重新載入」擴充。
2. 開一個真實 104 台積電職缺頁。
3. Expected：右上出現「論壇風評」浮動面板，載入後顯示 PTT Tech_Job / Salary 等版的相關標題，點任一筆會新分頁開啟 PTT 原文。
4. 測收合按鈕（–）可收合/展開。
5. 開一家冷門、論壇沒討論的公司 → Expected：面板顯示「PTT 上找不到相關討論」。

- [ ] **Step 5: Commit**

```bash
git add src/content.js src/panel.css
git commit -m "feat: add content script company detection and result panel"
```

---

## Task 8: 整體驗收與韌性收尾（手動）

**Files:**
- 視驗收結果 Modify 上述任一檔案

- [ ] **Step 1: 多公司抽驗**

在 3～5 家不同規模公司的 104 職缺頁測試（大公司如台積電、聯發科；中小型各一）。記錄：偵測到公司名 ✅/❌、面板有無結果、有無明顯誤報。

- [ ] **Step 2: 韌性檢查**

- 在**非**職缺/公司頁（如 104 首頁）→ Expected：不注入面板、不報錯（content_scripts match 已限制，確認無 console error）。
- service worker console 無未捕捉例外。

- [ ] **Step 3: 更新 spec 里程碑狀態**

在 `docs/spec.md` 的 §11 里程碑，把 Stage 1 標記為完成，附一句實測命中率觀察。

- [ ] **Step 4: 執行全測試最終確認**

Run: `node --test`
Expected: PASS（12 tests pass）

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: stage 1 acceptance fixes and milestone update"
```

---

## 完成定義（Stage 1 Done）

- `node --test` 全綠（normalize / ptt / handler 共 12 項）。
- 載入未封裝擴充後，在真實 104 職缺頁能自動顯示該公司的 PTT 討論標題＋可點連結。
- 冷門公司顯示「找不到相關討論」而非壞掉；非目標頁面不注入。
- 所有變更已分段 commit。

## 不在 Stage 1（後續 Stage）

- Dcard 抓取（Stage 2，先做真瀏覽器 spike）
- 公司名別名字典
- 1111 支援
- 偏好篩選
