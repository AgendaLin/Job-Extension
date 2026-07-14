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

test("後綴夾在中間（分廠名）時取後綴之前的核心名", () => {
  assert.deepEqual(
    normalizeCompanyName("中華汽車工業股份有限公司楊梅廠"),
    ["中華汽車工業股份有限公司楊梅廠", "中華汽車工業"]
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
