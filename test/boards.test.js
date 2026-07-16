import test from "node:test";
import assert from "node:assert/strict";
import { BASE_BOARDS, boardsForIndustry } from "../src/lib/boards.js";

test("沒有產業資訊時只用基本板", () => {
  assert.deepEqual(boardsForIndustry(null), BASE_BOARDS);
  assert.deepEqual(boardsForIndustry(""), BASE_BOARDS);
  assert.deepEqual(boardsForIndustry(undefined), BASE_BOARDS);
});

test("理工類產業不需要額外板（基本板已涵蓋）", () => {
  assert.deepEqual(boardsForIndustry("光電產業"), BASE_BOARDS);
  assert.deepEqual(boardsForIndustry("電腦軟體服務業"), BASE_BOARDS);
  assert.deepEqual(boardsForIndustry("半導體業"), BASE_BOARDS);
});

test("會計類產業加 Accounting 板", () => {
  // 實測：資誠/安永在 Accounting 板的討論比基本 4 板加起來還多
  assert.deepEqual(boardsForIndustry("會計服務業"), [
    ...BASE_BOARDS,
    "Accounting",
  ]);
  assert.deepEqual(boardsForIndustry("記帳及會計服務業"), [
    ...BASE_BOARDS,
    "Accounting",
  ]);
});

test("法律類加 Law 板", () => {
  assert.deepEqual(boardsForIndustry("法律服務業"), [...BASE_BOARDS, "Law"]);
});

test("金融/銀行類加 Bank_Service 板", () => {
  assert.deepEqual(boardsForIndustry("銀行業"), [...BASE_BOARDS, "Bank_Service"]);
  assert.deepEqual(boardsForIndustry("證券及期貨業"), [
    ...BASE_BOARDS,
    "Bank_Service",
  ]);
});

test("保險類加 Insurance 板", () => {
  assert.deepEqual(boardsForIndustry("保險業"), [...BASE_BOARDS, "Insurance"]);
});

test("廣告行銷類加 Marketing 板", () => {
  assert.deepEqual(boardsForIndustry("廣告行銷公關業"), [
    ...BASE_BOARDS,
    "Marketing",
  ]);
});

test("媒體傳播類加 media-chaos 板", () => {
  assert.deepEqual(boardsForIndustry("大眾傳播相關業"), [
    ...BASE_BOARDS,
    "media-chaos",
  ]);
  assert.deepEqual(boardsForIndustry("出版業"), [...BASE_BOARDS, "media-chaos"]);
});

test("同時命中多個規則時都加，且不重複", () => {
  const out = boardsForIndustry("法律及會計服務業");
  assert.deepEqual(out, [...BASE_BOARDS, "Accounting", "Law"]);
  assert.equal(new Set(out).size, out.length);
});
