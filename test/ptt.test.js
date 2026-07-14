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
