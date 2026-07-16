import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAliasPayload,
  loadAliases,
  CACHE_TTL_MS,
} from "../src/lib/remote-aliases.js";

const VALID = {
  version: 1,
  aliases: [
    { match: "台灣積體電路", nicknames: ["台積電"] },
    { match: "工業技術研究院", nicknames: ["工研院"] },
  ],
};

test("parseAliasPayload 接受合法內容", () => {
  assert.deepEqual(parseAliasPayload(VALID), VALID.aliases);
});

test("parseAliasPayload 丟掉格式錯的單筆，保留合法的", () => {
  const out = parseAliasPayload({
    aliases: [
      { match: "台灣積體電路", nicknames: ["台積電"] },
      { match: "", nicknames: ["空的match"] },
      { match: "沒有綽號", nicknames: [] },
      { match: "綽號不是陣列", nicknames: "台積電" },
      { nicknames: ["沒有match"] },
      "根本不是物件",
    ],
  });
  assert.deepEqual(out, [{ match: "台灣積體電路", nicknames: ["台積電"] }]);
});

test("parseAliasPayload 對整包壞掉的內容回 null", () => {
  assert.equal(parseAliasPayload(null), null);
  assert.equal(parseAliasPayload({}), null);
  assert.equal(parseAliasPayload({ aliases: "not-array" }), null);
  assert.equal(parseAliasPayload({ aliases: [] }), null);
  // 全部單筆都不合法 → 等同沒有可用資料
  assert.equal(parseAliasPayload({ aliases: [{ match: "" }] }), null);
});

function fakeStorage(initial = {}) {
  let store = { ...initial };
  return {
    get: async (key) => ({ [key]: store[key] }),
    set: async (obj) => {
      store = { ...store, ...obj };
    },
    _dump: () => store,
  };
}

test("loadAliases 快取還新鮮時，不打網路", async () => {
  let fetched = false;
  const storage = fakeStorage({
    jfrAliases: { at: 1000, aliases: VALID.aliases },
  });
  const out = await loadAliases({
    fetchFn: async () => {
      fetched = true;
      throw new Error("不該被呼叫");
    },
    storage,
    now: 1000 + CACHE_TTL_MS - 1,
  });
  assert.equal(fetched, false);
  assert.deepEqual(out, VALID.aliases);
});

test("loadAliases 快取過期就重抓並寫回快取", async () => {
  const storage = fakeStorage({
    jfrAliases: { at: 0, aliases: [{ match: "舊的", nicknames: ["舊"] }] },
  });
  const out = await loadAliases({
    fetchFn: async () => ({ ok: true, json: async () => VALID }),
    storage,
    now: CACHE_TTL_MS + 1,
  });
  assert.deepEqual(out, VALID.aliases);
  assert.deepEqual(storage._dump().jfrAliases.aliases, VALID.aliases);
  assert.equal(storage._dump().jfrAliases.at, CACHE_TTL_MS + 1);
});

test("loadAliases 網路失敗時退回舊快取，不會壞掉", async () => {
  const stale = [{ match: "舊的", nicknames: ["舊"] }];
  const storage = fakeStorage({ jfrAliases: { at: 0, aliases: stale } });
  const out = await loadAliases({
    fetchFn: async () => {
      throw new Error("network down");
    },
    storage,
    now: CACHE_TTL_MS + 1,
  });
  assert.deepEqual(out, stale);
});

test("loadAliases 沒快取又抓不到 → 回 null（呼叫端用內建字典）", async () => {
  const storage = fakeStorage();
  const out = await loadAliases({
    fetchFn: async () => ({ ok: false, json: async () => ({}) }),
    storage,
    now: 123,
  });
  assert.equal(out, null);
});

test("loadAliases 遠端回傳垃圾時不覆蓋快取", async () => {
  const good = [{ match: "好的", nicknames: ["好"] }];
  const storage = fakeStorage({ jfrAliases: { at: 0, aliases: good } });
  const out = await loadAliases({
    fetchFn: async () => ({ ok: true, json: async () => ({ aliases: "垃圾" }) }),
    storage,
    now: CACHE_TTL_MS + 1,
  });
  assert.deepEqual(out, good);
  assert.deepEqual(storage._dump().jfrAliases.aliases, good);
});
