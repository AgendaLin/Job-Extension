import test from "node:test";
import assert from "node:assert/strict";
import { buildPttSearchUrl, parsePttSearchHtml, searchPtt } from "../src/lib/ptt.js";

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

test("buildPttSearchUrl 第 2 頁之後才帶 page 參數", () => {
  assert.equal(
    buildPttSearchUrl("Accounting", "資誠"),
    "https://www.ptt.cc/bbs/Accounting/search?q=%E8%B3%87%E8%AA%A0"
  );
  assert.equal(
    buildPttSearchUrl("Accounting", "資誠", 2),
    "https://www.ptt.cc/bbs/Accounting/search?q=%E8%B3%87%E8%AA%A0&page=2"
  );
});

test("滿頁就續抓下一頁，沒滿就停（自適應分頁）", async () => {
  const fullPage = (n) =>
    Array.from(
      { length: n },
      (_, i) =>
        `<div class="title"><a href="/bbs/Accounting/M.${i}.A.html">文章${i}</a></div>`
    ).join("");

  const asked = [];
  const fakeFetch = async (url) => {
    asked.push(url);
    const page = Number(new URL(url).searchParams.get("page") || 1);
    // 第 1、2 頁滿 20 筆，第 3 頁只有 5 筆 → 應該停在第 3 頁
    return { ok: true, text: async () => fullPage(page === 3 ? 5 : 20) };
  };

  const results = await searchPtt("資誠", ["Accounting"], fakeFetch);
  assert.equal(asked.length, 3);
  assert.equal(results.length, 45); // 20 + 20 + 5
});

test("第一頁沒滿就不抓第二頁", async () => {
  const asked = [];
  const fakeFetch = async (url) => {
    asked.push(url);
    return {
      ok: true,
      text: async () =>
        `<div class="title"><a href="/bbs/Salary/M.1.A.html">只有一筆</a></div>`,
    };
  };
  await searchPtt("冷門公司", ["Salary"], fakeFetch);
  assert.equal(asked.length, 1);
});

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

test("searchPtt fetchFn 拋錯的板貢獻空陣列，不影響其他板", async () => {
  const fakeFetch = async (url) => {
    if (url.includes("Tech_Job")) {
      return {
        ok: true,
        text: async () =>
          `<div class="title"><a href="/bbs/Tech_Job/M.1.A.html">台積電甲</a></div>`,
      };
    }
    throw new Error("network");
  };

  const results = await searchPtt("台積電", ["Tech_Job", "Salary"], fakeFetch);
  assert.deepEqual(results, [
    {
      title: "台積電甲",
      board: "Tech_Job",
      url: "https://www.ptt.cc/bbs/Tech_Job/M.1.A.html",
    },
  ]);
});
