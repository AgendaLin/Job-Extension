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

// 以下產業名稱皆取自 104 官方分類表（Indust.json），非杜撰
test("醫療類加 Nurse 板（實測長庚/台大醫院各 20 筆）", () => {
  assert.deepEqual(boardsForIndustry("醫院"), [...BASE_BOARDS, "Nurse"]);
  assert.deepEqual(boardsForIndustry("診所"), [...BASE_BOARDS, "Nurse"]);
});

test("文教類加 Teacher 板", () => {
  assert.deepEqual(boardsForIndustry("補習班"), [...BASE_BOARDS, "Teacher"]);
  assert.deepEqual(boardsForIndustry("安親／才藝班"), [
    ...BASE_BOARDS,
    "Teacher",
  ]);
});

test("航空類加 Aviation 板", () => {
  assert.deepEqual(boardsForIndustry("民航"), [...BASE_BOARDS, "Aviation"]);
});

test("金融類的冷門小類也要涵蓋（原本漏掉）", () => {
  for (const ind of [
    "信用合作社業",
    "農／漁會信用部",
    "郵政儲金匯兌業",
    "電子支付業",
    "創投業",
    "其他投資理財相關業",
  ]) {
    assert.deepEqual(
      boardsForIndustry(ind),
      [...BASE_BOARDS, "Bank_Service"],
      `${ind} 應加 Bank_Service`
    );
  }
});

test("建築關鍵字不可誤中製造業", () => {
  // 「金屬結構及建築組件製造業」是製造業，不該搜建築板
  assert.deepEqual(boardsForIndustry("金屬結構及建築組件製造業"), BASE_BOARDS);
  assert.deepEqual(boardsForIndustry("建築及工程技術服務業"), [
    ...BASE_BOARDS,
    "Architecture",
  ]);
});

test("同時命中多個規則時都加，且不重複", () => {
  const out = boardsForIndustry("法律及會計服務業");
  assert.deepEqual(out, [...BASE_BOARDS, "Accounting", "Law"]);
  assert.equal(new Set(out).size, out.length);
});
