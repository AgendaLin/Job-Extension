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
  // 用沒有綽號對照的中性公司名，讓本測試只驗 handler 的分詞/去重，不與別名字典耦合
  const fakeSearchPtt = async (term) => {
    calls.push(term);
    // 全名與短名各回一筆，其中一筆 url 相同以驗證去重
    if (term === "測試科技股份有限公司")
      return [{ title: "全名文", board: "Tech_Job", url: "shared" }];
    if (term === "測試科技")
      return [
        { title: "短名文", board: "Salary", url: "unique" },
        { title: "重複文", board: "Tech_Job", url: "shared" },
      ];
    return [];
  };

  const { results } = await handleSearch("測試科技股份有限公司", {
    searchPtt: fakeSearchPtt,
    boards: ["Tech_Job"],
  });

  assert.deepEqual(calls, ["測試科技股份有限公司", "測試科技"]);
  assert.equal(results.length, 2); // shared 去重後只剩一筆
  assert.deepEqual(results.map((r) => r.url).sort(), ["shared", "unique"]);
});

test("handleSearch 對空公司名回空結果", async () => {
  const { results } = await handleSearch("", { searchPtt: async () => [] });
  assert.deepEqual(results, []);
});
