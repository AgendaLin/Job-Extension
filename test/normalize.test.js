import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCompanyName, primarySearchTerm } from "../src/lib/normalize.js";

test("保留全名、去後綴短名、剝行業詞，並補上綽號", () => {
  assert.deepEqual(
    normalizeCompanyName("台灣積體電路製造股份有限公司"),
    [
      "台灣積體電路製造股份有限公司",
      "台灣積體電路製造",
      "台灣積體電路",
      "台積電",
    ]
  );
});

test("剝行業類別詞得到更短核心名（克勞德科技 → 克勞德）", () => {
  assert.deepEqual(normalizeCompanyName("克勞德科技股份有限公司"), [
    "克勞德科技股份有限公司",
    "克勞德科技",
    "克勞德",
  ]);
});

test("縮成通用詞會被黑名單擋掉（中華食品 不縮成 中華）", () => {
  assert.deepEqual(normalizeCompanyName("中華食品股份有限公司"), [
    "中華食品股份有限公司",
    "中華食品",
  ]);
});

test("有限公司也會被去掉", () => {
  assert.deepEqual(
    normalizeCompanyName("愛卡拉互動媒體有限公司"),
    ["愛卡拉互動媒體有限公司", "愛卡拉互動媒體"]
  );
});

test("後綴夾在中間（分廠名）時取後綴之前的核心名，再剝行業詞", () => {
  assert.deepEqual(
    normalizeCompanyName("中華汽車工業股份有限公司楊梅廠"),
    ["中華汽車工業股份有限公司楊梅廠", "中華汽車工業", "中華汽車"]
  );
});

test("英文_中文 格式會拆底線分別當搜尋詞（並補綽號）", () => {
  assert.deepEqual(
    normalizeCompanyName("KEYENCE_台灣基恩斯股份有限公司"),
    ["KEYENCE", "台灣基恩斯股份有限公司", "台灣基恩斯", "基恩斯"]
  );
});

test("沒有對照到綽號的公司只走通用規則、不會硬塞綽號", () => {
  assert.deepEqual(normalizeCompanyName("鼎鼎大名科技股份有限公司"), [
    "鼎鼎大名科技股份有限公司",
    "鼎鼎大名科技",
    "鼎鼎大名",
  ]);
});

test("會計師事務所要能取到短名（PTT 只講「安永」，全名搜是 0 筆）", () => {
  assert.deepEqual(normalizeCompanyName("安永聯合會計師事務所"), [
    "安永聯合會計師事務所",
    "安永",
  ]);
});

test("法律事務所同理", () => {
  assert.deepEqual(normalizeCompanyName("理律法律事務所"), [
    "理律法律事務所",
    "理律",
  ]);
});

test("沒有法律後綴時只回全名", () => {
  assert.deepEqual(normalizeCompanyName("Google Taiwan"), ["Google Taiwan"]);
});

test("前後空白會被 trim", () => {
  assert.deepEqual(normalizeCompanyName("  好棒棒科技股份有限公司 "), [
    "好棒棒科技股份有限公司",
    "好棒棒科技",
    "好棒棒",
  ]);
});

test("空字串或非字串回空陣列", () => {
  assert.deepEqual(normalizeCompanyName(""), []);
  assert.deepEqual(normalizeCompanyName(null), []);
  assert.deepEqual(normalizeCompanyName(undefined), []);
});

test("primarySearchTerm 有綽號時用綽號", () => {
  assert.equal(primarySearchTerm("台灣積體電路製造股份有限公司"), "台積電");
  assert.equal(primarySearchTerm("KEYENCE_台灣基恩斯股份有限公司"), "基恩斯");
});

test("primarySearchTerm 沒綽號時用中文全名去後綴（不剝行業詞）", () => {
  assert.equal(primarySearchTerm("全景軟體股份有限公司"), "全景軟體");
  assert.equal(primarySearchTerm("中華汽車工業股份有限公司楊梅廠"), "中華汽車工業");
});

test("primarySearchTerm 空輸入回空字串", () => {
  assert.equal(primarySearchTerm(""), "");
  assert.equal(primarySearchTerm(null), "");
});
