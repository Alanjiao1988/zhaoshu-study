"use strict";
// 发版检查：service worker 是 cache-first，版本号或预缓存清单一旦不同步，
// iPad 上就会一直跑旧代码，或者断网打不开。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

const sw = read("sw.js");
const swVersion = sw.match(/const VERSION = "([^"]+)"/)[1];
const swAssets = JSON.parse("[" + sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1].replace(/\s+/g,"") + "]")
  .map(u => u.replace(/^\.\//, ""));

test("sw.js 的 VERSION 与 APP_VERSION、package.json 一致", () => {
  const appVersion = read("js/config.js").match(/const APP_VERSION = "([^"]+)"/)[1];
  assert.equal(swVersion, appVersion);
  assert.equal(JSON.parse(read("package.json")).version, appVersion);
});

test("index.html 引用的本地文件全部在预缓存清单里", () => {
  const html = read("index.html");
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => m[1]);
  assert.ok(refs.length > 10);
  for (const r of refs) assert.ok(swAssets.includes(r), "sw.js 的 ASSETS 缺少 " + r);
});

test("预缓存清单里的文件都真实存在", () => {
  for (const a of swAssets) {
    if (a === "") continue;   // "./" 即根目录
    assert.ok(fs.existsSync(path.join(ROOT, a)), "不存在：" + a);
  }
});
