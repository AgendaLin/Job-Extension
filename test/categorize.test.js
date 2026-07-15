import test from "node:test";
import assert from "node:assert/strict";
import { isNewsTitle } from "../src/lib/categorize.js";

test("[新聞] 開頭視為新聞", () => {
  assert.equal(isNewsTitle("[新聞] 大立光涉侵權遭起訴 聲請「容忍」續用"), true);
});

test("[新聞] 後面沒空白也算（PTT 常見）", () => {
  assert.equal(isNewsTitle("[新聞]大立光林恩平透露產業動向！"), true);
});

test("Re: [新聞] 回文屬於同一串，也算新聞", () => {
  assert.equal(isNewsTitle("Re: [新聞] 劍指台積電！日大廠放話不能輸"), true);
});

test("其他類別不算新聞", () => {
  assert.equal(isNewsTitle("[心得] 面試 大立光/艾克爾/采鈺/百佳泰/美光"), false);
  assert.equal(isNewsTitle("[請益] 大立光電研替"), false);
  assert.equal(isNewsTitle("[討論] 工作選擇，京元、大立光、美光"), false);
});

test("標題含新聞兩字但不是分類標籤，不算", () => {
  assert.equal(isNewsTitle("[心得] 看新聞才知道公司要裁員"), false);
});

test("空值不算新聞", () => {
  assert.equal(isNewsTitle(""), false);
  assert.equal(isNewsTitle(null), false);
  assert.equal(isNewsTitle(undefined), false);
});
