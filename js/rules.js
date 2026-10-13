"use strict";
/* =====================================================================
   核心规则：点卯记录 → 每日应做清单 → 账本冻结 → 连击 / 军功 / 招贤令
   ===================================================================== */

/* ---------------------- 点卯记录 ---------------------- */
function rec(dateStr,taskId){
  const day=ST.records[dateStr];
  return day ? day[taskId] : null;
}
const isDone = r => !!r && r.level>=0.5;
const doneOn = (dateStr,taskId) => isDone(rec(dateStr,taskId));

function setRec(dateStr,taskId,type,minutes){
  if(!type){
    if(ST.records[dateStr]){
      delete ST.records[dateStr][taskId];
      if(!Object.keys(ST.records[dateStr]).length) delete ST.records[dateStr];
    }
    return;
  }
  if(!ST.records[dateStr]) ST.records[dateStr]={};
  const level=(RESULTS[type]||RESULTS.miss).level;
  ST.records[dateStr][taskId]={ level, type, minutes:minutes||0, at:Date.now() };
}
function weekDone(taskId,dateStr){
  return weekDates(dateStr).filter(d=>doneOn(d,taskId)).length;
}
const weekTargetOf = t => Math.max(1, t.weekTarget||1);
// 非灵活类军令在某天是否该出现
function appearsOn(t,dateStr){
  return t.type==="daily" || (t.type==="fixed" && (t.weekdays||[]).includes(dow(dateStr)));
}

/* ---- 账目冻结与补录窗口 ----
   规则只有一条：最近 BACKFILL_DAYS 天（含今天）是「活的」，可以补录点卯；
   更早的日子一经结算就冻成石头，改任务、删军令都动不了它。 */
function backfillFloor(){ return addD(TODAY(), -(BACKFILL_DAYS-1)); }
function isFrozen(dateStr){ return dateStr < backfillFloor(); }
function canBackfill(dateStr){ return !isFrozen(dateStr) && dateStr <= TODAY(); }
// 已结算的冻结账页；没有则返回 null
function frozenSheet(dateStr){
  const L=ST.ledger[dateStr];
  return (isFrozen(dateStr) && L && L.settled) ? L : null;
}

/* ---- 休整期：生病、假期、考试周，工具要承认这些节律 ---- */
function activeBreak(dateStr){
  return ST.breaks.find(b => dateStr >= b.from && dateStr <= b.to) || null;
}
// 休整日 = 落在某个休整区间内，且孩子没有主动说「今天想做一点」
// 已冻结的日子以账本为准：事后增删休整期不改写历史
function isRestDay(dateStr){
  const L=frozenSheet(dateStr);
  if(L) return !!L.rest;
  if(ST.extraDays[dateStr]) return false;
  // 当天已经点过卯的，不能被事后加的休整期一笔勾销（已发的招贤令不收回）
  const day=ST.records[dateStr];
  if(day && Object.values(day).some(isDone)) return false;
  return !!activeBreak(dateStr);
}
function restReason(dateStr){
  const b=activeBreak(dateStr);
  return b ? (b.reason||"休整") : "";
}

/* ---------------------- 每日应做清单 ---------------------- */
// 已经结算过的历史日子直接返回账本里冻结的快照，改任务不再影响它的样子
function tasksForDate(dateStr){
  const L=frozenSheet(dateStr);
  if(L) return (L.tasks||[]).slice();
  if(isRestDay(dateStr)) return [];               // 休整日不派军令
  const out=[];
  for(const t of ST.tasks){
    if(t.archived) continue;
    if(t.type!=="flex"){ if(appearsOn(t,dateStr)) out.push(t); continue; }
    const r=rec(dateStr,t.id);
    if(r && r.type==="skip") continue;              // 挂了免战牌 → 顺延
    if(r && r.level>0){ out.push(t); continue; }
    if(weekDone(t.id,dateStr)>=weekTargetOf(t)) continue; // 本周已达成 → 撤下
    out.push(t);
  }
  return out;
}
// 本周已达成、今天撤下休整的灵活军令
function holidayTasks(dateStr){
  if(frozenSheet(dateStr) || isRestDay(dateStr)) return [];
  return ST.tasks.filter(t=> !t.archived && t.type==="flex" && !rec(dateStr,t.id)
    && weekDone(t.id,dateStr) >= weekTargetOf(t));
}
// 已冻结的日子直接用账本里的数，不受日后删任务、删记录影响
function dayCounts(dateStr){
  const L=frozenSheet(dateStr);
  if(L) return { list:(L.tasks||[]).slice(), total:L.total||0, done:L.done||0 };
  const list=tasksForDate(dateStr);
  return { list, total:list.length, done:list.filter(t=>doneOn(dateStr,t.id)).length };
}
function dayIsComplete(dateStr){
  const c=dayCounts(dateStr);
  return c.total>0 && c.done>=c.total;
}
function dayRatio(dateStr){
  const c=dayCounts(dateStr);
  return c.total ? c.done/c.total : 1;
}
function dayStars(dateStr){
  const day=ST.records[dateStr]; if(!day) return 0;
  let s=0; for(const k in day) s+=day[k].level||0;
  return round1(s);
}
// 判断某天是否完成：已冻结的看账本，窗口内的实时算
function isCompleteOn(dateStr){
  const L=frozenSheet(dateStr);
  return L ? !!L.complete : dayIsComplete(dateStr);
}

/* ---------------------- 连击 ---------------------- */
// 从 dateStr 往前数，连续多少天军令齐备
// 休整日直接跳过：既不算一天，也不打断连击 —— 孩子病了三天回来，连击不该断
function streakEndingAt(dateStr){
  let n=0, d=dateStr, guard=0;
  while(guard++<1200){
    if(isRestDay(d)){ d=addD(d,-1); continue; }
    if(!isCompleteOn(d)) break;
    n++; d=addD(d,-1);
  }
  return n;
}
const streakTier = n => STREAK_TIERS.find(t=>n>=t.n) || null;
function streakMult(n){ const t=streakTier(n); return t ? t.m : 1; }
function streakName(n){ const t=streakTier(n); return t ? t.name : ""; }
// 当前连击：今天还没做完不算断 —— 从昨天往前数；做完了就把今天也算上
function currentStreak(){
  const t=TODAY();
  return isCompleteOn(t) ? streakEndingAt(t) : streakEndingAt(addD(t,-1));
}

/* ---------------------- 账本 ---------------------- */
// 结算一天的账：把当天的应做清单、完成情况、所得军功、发放的招贤令固定下来
function buildDaySheet(dateStr){
  const rest = isRestDay(dateStr);
  const { list, total, done } = dayCounts(dateStr);
  const base=dayStars(dateStr);
  const st=total ? streakEndingAt(dateStr) : 0;
  const mult=total ? streakMult(st) : 1;
  const complete = total>0 && done>=total;
  return {
    // 存快照而不是 id：即使日后这项军令被改了名或删掉，历史照原样呈现
    tasks:list.map(t=>({
      id:t.id, name:t.name, emoji:t.emoji||"", subject:t.subject,
      type:t.type, boss:!!t.boss, planMin:t.planMin||0,
      timeSlot:t.timeSlot||"any", weekTarget:t.weekTarget||1
    })),
    done, total, complete, rest,
    base, mult, merit:round1(base*mult), streak:st,
    ticket: complete?1:0, settled:true, at:Date.now()
  };
}
// 把所有「已经过了补录窗口、尚未结算」的日子按时间顺序冻结。结算后永不再重算。
// 注意：不能只遍历有打卡记录的日子 —— 那些「当天没打开、一个字没记」的日子
// 同样要冻结，否则它的应做清单还是实时的，改周目标仍会改写历史。
function settleLedger(){
  const cutoff=backfillFloor();
  let start=cutoff;
  if(ST.createdAt && ST.createdAt<start) start=ST.createdAt;
  for(const d of Object.keys(ST.records)) if(d<start) start=d;
  let changed=false;
  for(const d of dateRange(start, addD(cutoff,-1))){
    const L=ST.ledger[d];
    if(!(L && L.settled)){ ST.ledger[d]=buildDaySheet(d); changed=true; }
  }
  return changed;
}
// 补录窗口里还没结算的日子：得实时算进来，不然刚补录的点卯不认账
function liveWindowDates(){
  const t=TODAY(), floor=backfillFloor();
  const set=new Set(Object.keys(ST.records));
  set.add(t);
  return Array.from(set).filter(d => d>=floor && d<=t && !(ST.ledger[d] && ST.ledger[d].settled)).sort();
}

/* ---------------------- 军功 ---------------------- */
// 某天的军功（冻结的走账本，窗口内的实时算，都含连击倍率）
function dayMerit(dateStr){
  const L=frozenSheet(dateStr);
  if(L) return L.merit||0;
  return round1(dayStars(dateStr) * streakMult(streakEndingAt(dateStr)));
}
// 点卯所得 = 已冻结的历史账本 + 补录窗口内实时算的
function earnedMerit(){
  let s=0;
  for(const d in ST.ledger) s+=ST.ledger[d].merit||0;
  for(const d of liveWindowDates()) s+=dayMerit(d);
  return round1(s);
}
function totalMerit(){ return round1(earnedMerit() + ST.bonusMerit); }
function spentMerit(){ return round1(ST.vault.filter(v=>v.redeemed).reduce((a,b)=>a+(b.merit||0),0)); }
// 可用军功：不用 Math.max(0,...) 把亏空悄悄吞掉，显示时再处理
function availMerit(){ return round1(totalMerit()-spentMerit()); }
// 官职用历史最高军功，只升不降
function rankMerit(){
  const m=totalMerit();
  if(m > ST.peakMerit) ST.peakMerit=m;
  return ST.peakMerit;
}
function rankOf(merit){
  let cur=RANKS[0], next=RANKS[1]||null;
  for(let i=0;i<RANKS.length;i++) if(merit>=RANKS[i].s){ cur=RANKS[i]; next=RANKS[i+1]||null; }
  return { cur, next };
}
function myRank(){ return rankOf(rankMerit()); }

/* ---------------------- 招贤令 ---------------------- */
function bossBeaten(dateStr){ return !!ST.bossDefeats[dateStr]; }
function ticketsEarned(){
  let n=0;
  for(const d in ST.ledger) n += ST.ledger[d].ticket||0;
  for(const d of liveWindowDates()) if(dayIsComplete(d)) n += 1;
  n += 2*Object.keys(ST.bossDefeats).length;
  return n + ST.bonusTickets;
}
function ticketsAvail(){ return Math.max(0, ticketsEarned()-ST.draws); }
