// 在 Node 里加载不碰 DOM 的那几层脚本，时钟可控
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const LOGIC = ["js/config.js","js/util.js","js/store.js","js/rules.js","js/features.js"];

function makeApp(today){
  const store = new Map();
  const ctx = {
    console, Math, Date, JSON,
    localStorage: {
      getItem: k => store.has(k) ? store.get(k) : null,
      setItem: (k,v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    }
  };
  vm.createContext(ctx);
  for(const f of LOGIC){
    vm.runInContext(fs.readFileSync(path.join(ROOT,f),"utf8"), ctx, { filename:f });
  }
  const run = code => vm.runInContext(code, ctx);
  ctx.__setToday = s => run(`NOW = () => parseD(${JSON.stringify(s)})`);
  if(today) ctx.__setToday(today);
  run("ST = defaultState()");
  return { run, ctx, store };
}
module.exports = { makeApp };
