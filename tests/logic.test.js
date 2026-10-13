"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { makeApp } = require("./harness");

// 2026-10-13 是周二
const TODAY = "2026-10-13";

// 让某天所有应做军令都完胜
const COMPLETE_DAY = `(d => { for(const t of tasksForDate(d)) setRec(d,t.id,"full",10); })`;

test("日期工具：周一起算、跨月", () => {
  const { run } = makeApp(TODAY);
  assert.equal(run(`weekStart("2026-10-13")`), "2026-10-12");
  assert.equal(run(`weekStart("2026-10-18")`), "2026-10-12"); // 周日归上一周
  assert.equal(run(`addD("2026-10-31",1)`), "2026-11-01");
  assert.equal(run(`daysBetween("2026-10-01","2026-10-13")`), 12);
  assert.equal(run(`cnNum(120)`), "一百二十");
});

test("连击：今天还没做完不算断", () => {
  const { run } = makeApp(TODAY);
  run(`ST.createdAt="2026-10-01"`);
  for(const d of ["2026-10-10","2026-10-11","2026-10-12"]) run(`${COMPLETE_DAY}("${d}")`);
  run("settleLedger()");
  assert.equal(run("dayIsComplete(TODAY())"), false);
  assert.equal(run("currentStreak()"), 3);
  run(`${COMPLETE_DAY}(TODAY())`);
  assert.equal(run("currentStreak()"), 4);
  assert.equal(run("streakMult(currentStreak())"), 1.2);
});

test("休整日既不算一天也不打断连击", () => {
  const { run } = makeApp(TODAY);
  run(`ST.createdAt="2026-10-01"`);
  run(`${COMPLETE_DAY}("2026-10-08"); ${COMPLETE_DAY}("2026-10-09")`);
  run(`ST.breaks.push({id:"b",from:"2026-10-10",to:"2026-10-12",reason:"生病"})`);
  run("settleLedger()");
  assert.equal(run(`tasksForDate("2026-10-12").length`), 0);
  assert.equal(run("currentStreak()"), 2);
});

test("账本冻结：改周目标不改写历史军功", () => {
  const { run } = makeApp(TODAY);
  run(`ST.createdAt="2026-10-01"`);
  run(`${COMPLETE_DAY}("2026-10-05")`);
  run("settleLedger()");
  const before = run("earnedMerit()");
  const ledgerBefore = run(`JSON.stringify(ST.ledger["2026-10-05"].tasks.map(t=>t.id))`);
  run(`for(const t of ST.tasks) if(t.type==="flex") t.weekTarget=1`);
  run(`ST.tasks.push({id:"new",name:"新军令",subject:"cn",type:"daily",planMin:5})`);
  assert.equal(run("earnedMerit()"), before);
  assert.equal(run(`JSON.stringify(tasksForDate("2026-10-05").map(t=>t.id))`), ledgerBefore);
  assert.equal(run(`isCompleteOn("2026-10-05")`), true);
});

test("补录窗口：最近 3 天可补，更早的冻结", () => {
  const { run } = makeApp(TODAY);
  assert.equal(run(`canBackfill("2026-10-11")`), true);
  assert.equal(run(`canBackfill("2026-10-10")`), false);
  assert.equal(run(`canBackfill("2026-10-14")`), false);
  // 补录昨天的点卯，当场计入军功和招贤令
  run(`${COMPLETE_DAY}("2026-10-12")`);
  assert.ok(run("earnedMerit()") > 0);
  assert.equal(run("ticketsEarned()"), 1);
});

test("事后加的休整期不改写已冻结日子", () => {
  const { run } = makeApp(TODAY);
  run(`ST.createdAt="2026-10-01"`);
  run("settleLedger()");
  run(`ST.breaks.push({id:"b",from:"2026-10-01",to:"2026-10-13",reason:"生病"})`);
  assert.equal(run(`isRestDay("2026-10-05")`), false);   // 冻结日按账本
  assert.equal(run(`isRestDay("2026-10-12")`), true);    // 窗口内实时
});

test("补发招贤令在 draws 为 0 时也有效（v4 修复）", () => {
  const { run } = makeApp(TODAY);
  assert.equal(run("ticketsAvail()"), 0);
  run("ST.bonusTickets+=3");
  assert.equal(run("ticketsAvail()"), 3);
});

test("保底：连揭 20 榜未出神将，第 21 榜必出", () => {
  const { run } = makeApp(TODAY);
  run("ST.pity.sinceLegend = PITY");
  const r = run("rollDraw()");
  assert.ok(r.kind==="hero" || r.kind==="dup");
  assert.equal(r.hero.tier, "legend");
  assert.equal(r.forced, true);
  assert.equal(run("ST.pity.sinceLegend"), 0);
});

test("抽卡统计大致符合设定", () => {
  const { run } = makeApp(TODAY);
  const res = run(`(() => { let hero=0, prize=0; for(let i=0;i<4000;i++){ ST.pity.sinceLegend=0; const r=rollDraw(); if(r.kind==="prize") prize++; else hero++; } return {hero,prize}; })()`);
  const p = res.hero/(res.hero+res.prize);
  assert.ok(p>0.74 && p<0.82, "武将比例 "+p);
  assert.equal(run("heroOwnedCount()"), 36);   // 4000 抽必然集齐
});

test("锦囊互换只在同门槛组内（修复反向判断）", () => {
  const { run } = makeApp(TODAY);
  run(`putInVault({name:"A",tier:"common",merit:50},"draw"); putInVault({name:"B",tier:"common",merit:50},"draw"); putInVault({name:"C",tier:"rare",merit:200},"draw")`);
  const groups = run("JSON.stringify(Object.keys(swappableGroups()))");
  assert.equal(groups, '["50"]');
  const [a,b,c] = run("ST.vault.map(v=>v.uid)");
  assert.equal(run(`swapVault("${a}","${c}")`), false);
  assert.equal(run(`swapVault("${a}","${b}")`), true);
  assert.equal(run("ST.vault[0].name"), "B");
});

test("开锦囊扣军功并发兑现券", () => {
  const { run } = makeApp(TODAY);
  run(`putInVault({name:"笔",emoji:"✏️",tier:"common",merit:5},"boss")`);
  const u = run("ST.vault[0].uid");
  assert.equal(run(`redeemVault("${u}").reason`), "merit");
  run("ST.bonusMerit = 10");
  assert.equal(run(`redeemVault("${u}").ok`), true);
  assert.equal(run("availMerit()"), 5);
  assert.equal(run("couponsPending().length"), 1);
  assert.equal(run("couponRate()"), 0);
});

test("出战：只能打今天，且要军令齐备", () => {
  const { run } = makeApp(TODAY);
  assert.equal(run("defeatBoss().ok"), false);
  run(`${COMPLETE_DAY}(TODAY())`);
  const r = run("defeatBoss()");
  assert.equal(r.ok, true);
  assert.equal(r.boss.name, "颜良");          // 周二
  assert.equal(run("ticketsEarned()"), 3);   // 齐备 1 + 破敌 2
  assert.equal(run("defeatBoss().ok"), false);
});

test("毕业：连续 4 个完整周满勤，休整日不算缺勤", () => {
  const { run } = makeApp(TODAY);
  run(`ST.createdAt="2026-09-01"`);
  run(`ST.tasks=[{id:"d",name:"早读",subject:"cn",type:"daily",planMin:10,weekTarget:1,weekdays:[]}]`);
  run(`ST.breaks.push({id:"b",from:"2026-09-20",to:"2026-09-22",reason:"生病"})`);
  run(`for(const d of dateRange("2026-09-14","2026-10-11")) if(!isRestDay(d)) setRec(d,"d","full",10)`);
  run("settleLedger()");
  assert.equal(run("checkGraduation().length"), 1);
});

test("难度建议：两周都做不到四成就建议降目标", () => {
  const { run } = makeApp(TODAY);
  run(`ST.createdAt="2026-09-01"`);
  run(`ST.tasks=[{id:"f",name:"奥数",subject:"math",type:"flex",planMin:30,weekTarget:3,weekdays:[]}]`);
  run(`setRec("2026-09-30","f","full",30)`);
  run("settleLedger()");
  const hints = run("difficultyHints()");
  assert.equal(hints.length, 1);
  assert.equal(hints[0].kind, "lower");
  run(`applyHintState("f","lower")`);
  assert.equal(run("ST.tasks[0].weekTarget"), 2);
  assert.equal(run("difficultyHints().length"), 0);   // 观察期内不再唠叨
});

test("迁移：v1 老数据补齐字段、窗口内账页放开", () => {
  const { run } = makeApp(TODAY);
  const old = {
    tasks:[{id:"x",name:"老军令",subject:"cn",type:"daily",planMin:10}],
    ledger:{ "2026-10-12":{settled:true,merit:3}, "2026-10-01":{settled:true,merit:2} },
    vault:[{uid:"v",name:"旧锦囊",tier:"common",merit:40,redeemed:true,gotAt:"2026-09-01"}],
    draws:2
  };
  run(`ST = hydrate(${JSON.stringify(old)})`);
  assert.equal(run("ST.schema"), 4);
  assert.equal(run("ST.bonusTickets"), 0);
  assert.equal(run(`"2026-10-12" in ST.ledger`), false);
  assert.equal(run(`"2026-10-01" in ST.ledger`), true);
  assert.equal(run("ST.coupons.length"), 1);
  assert.equal(run("ST.coupons[0].status"), "done");
  assert.ok(run("Array.isArray(ST.breaks) && Array.isArray(ST.signals)"));
});

test("存取往返", () => {
  const { run } = makeApp(TODAY);
  run(`ST.childName="阿斗"; save(); ST=null; ST=load();`);
  assert.equal(run("ST.childName"), "阿斗");
});

test("完美一周只认已经过完的整周", () => {
  const { run } = makeApp(TODAY);
  run(`ST.createdAt="2026-10-01"`);
  run(`${COMPLETE_DAY}("2026-10-12"); ${COMPLETE_DAY}("2026-10-13")`);
  run("calcAchievements()");
  assert.equal(run("!!ST.achievements.perfect_week"), false);
});

test("当天已点卯的日子，事后加休整期也不收回招贤令", () => {
  const { run } = makeApp(TODAY);
  run(`${COMPLETE_DAY}(TODAY())`);
  assert.equal(run("ticketsEarned()"), 1);
  run(`ST.breaks.push({id:"b",from:TODAY(),to:addD(TODAY(),6),reason:"生病"})`);
  assert.equal(run("isRestDay(TODAY())"), false);
  assert.equal(run("ticketsEarned()"), 1);
  assert.equal(run("isRestDay(addD(TODAY(),1))"), true);
});
