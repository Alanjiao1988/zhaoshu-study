"use strict";
/* =====================================================================
   玩法：主动性记录、兑现台、难度建议、招贤（抽卡）、毕业、成就、下一步提示
   这里只改状态，不碰 DOM。
   ===================================================================== */

/* ---- 主动性记录 ----
   这套系统真正的成功指标不是完成率，是「孩子自己想做」。
   完成率可以靠推，主动推不出来，所以必须单独记一笔。 */
function logSignal(kind, detail){
  ST.signals.push({ date:TODAY(), kind, detail:detail||"", at:Date.now() });
  if(ST.signals.length>600) ST.signals=ST.signals.slice(-600);
}
function signalsBetween(from,to){ return ST.signals.filter(s => s.date>=from && s.date<=to); }
// 休整期内孩子自愿开工
function markExtraDay(dateStr){
  ST.extraDays[dateStr]=true;
  logSignal("extra", "休整期里主动做了一天");
}

/* ---- 兑现台 ----
   军功换来的东西如果没人兑现，整套激励的信用就崩了。
   开锦囊时发一张券，家长点了「已兑现」才算闭环。 */
function couponFor(v){
  const c={ id:uid(), name:v.name, emoji:v.emoji||"🎁", tier:v.tier, merit:v.merit||0,
    openedAt:TODAY(), status:"pending", doneAt:"", note:"" };
  ST.coupons.push(c);
  return c;
}
function couponNo(c){ return "No."+String(c.id).slice(-4).toUpperCase(); }
function couponDays(c){ return c && c.openedAt ? Math.max(0, daysBetween(c.openedAt, TODAY())) : 0; }
function couponsPending(){ return ST.coupons.filter(c=>c.status!=="done"); }
function couponsDone(){ return ST.coupons.filter(c=>c.status==="done"); }
function couponOverdue(){ return couponsPending().filter(c=>couponDays(c) >= COUPON_LATE_DAYS); }
// 兑现率：给家长看的一面镜子
function couponRate(){
  return ST.coupons.length ? pct(couponsDone().length, ST.coupons.length) : null;
}
function settleCouponState(id, note){
  const c=ST.coupons.find(x=>x.id===id); if(!c) return null;
  c.status="done"; c.doneAt=TODAY(); c.note=note||"";
  return c;
}
// 开锦囊：扣军功、发兑现券
function redeemVault(u){
  const v=ST.vault.find(x=>x.uid===u);
  if(!v || v.redeemed) return { ok:false, reason:"gone" };
  const lack=round1(v.merit-availMerit());
  if(lack>0) return { ok:false, reason:"merit", lack };
  v.redeemed=true; v.redeemedAt=TODAY();
  return { ok:true, coupon:couponFor(v) };
}
// 同军功门槛、至少两件的锦囊才有得换：{ merit: [vault...] }
function swappableGroups(){
  const groups={};
  for(const v of ST.vault) if(!v.redeemed) (groups[v.merit]=groups[v.merit]||[]).push(v);
  for(const k in groups) if(groups[k].length<2) delete groups[k];
  return groups;
}
function swapVault(aUid,bUid){
  const a=ST.vault.find(x=>x.uid===aUid), b=ST.vault.find(x=>x.uid===bUid);
  if(!a||!b||a===b||a.merit!==b.merit||a.redeemed||b.redeemed) return false;
  for(const k of ["name","emoji","tier","from","wish"]){ const t=a[k]; a[k]=b[k]; b[k]=t; }
  return true;
}

/* ---- 完整周统计（难度建议和毕业共用）----
   只看已经整周过去的周；休整日不算进分母。整周休整返回 null。 */
function taskWeekStat(task, weekMonday){
  const days=weekDates(weekMonday);
  if(days[6] >= TODAY()) return null;
  const live=days.filter(d=>!isRestDay(d));
  if(!live.length) return null;
  let target=0, done=0, full=0, half=0;
  const count=d=>{ const r=rec(d,task.id); if(isDone(r)){ done++; if(r.type==="full") full++; else half++; } };
  if(task.type==="flex"){
    target=weekTargetOf(task);
    days.forEach(count);
  }else{
    for(const d of live){ if(!appearsOn(task,d)) continue; target++; count(d); }
  }
  if(!target) return null;
  return { pct:Math.min(1, done/target), target, done, full, half };
}

/* ---- 难度下调建议 ----
   只有「推」没有「退」，孩子就会一直在失败里泡着。 */
function hintCooling(taskId){
  const at=ST.hintApplied[taskId];
  return !!at && daysBetween(at, TODAY()) < HINT_COOLDOWN_DAYS;
}
function difficultyHints(){
  const out=[];
  const thisMon=weekStart(TODAY());
  for(const t of ST.tasks){
    if(t.archived || hintCooling(t.id)) continue;   // 刚改过的先观察，别追着改
    const ps=[taskWeekStat(t, addD(thisMon,-7)), taskWeekStat(t, addD(thisMon,-14))].filter(Boolean);
    if(!ps.length) continue;
    const avg=ps.reduce((a,b)=>a+b.pct,0)/ps.length;
    const pctTxt=Math.round(avg*100)+"%";
    const span = ps.length>1 ? "连续两周" : "上周";

    // 做不完 → 任务本身有问题，不是孩子有问题
    if(avg < 0.4){
      if(t.type==="flex" && weekTargetOf(t) > 1){
        out.push({ taskId:t.id, kind:"lower", tone:"warn",
          title:t.name+" "+span+"只有 "+pctTxt,
          body:"周目标可能定高了。降到 "+(weekTargetOf(t)-1)+" 次试试，先把节奏跑起来。",
          action:"降到 "+(weekTargetOf(t)-1)+" 次" });
      }else{
        out.push({ taskId:t.id, kind:"switch", tone:"warn",
          title:t.name+" "+span+"只有 "+pctTxt,
          body:"这项可能和当前的时间安排冲突。换个时间段，或者先暂停一阵。",
          action:"先暂停这项" });
      }
      continue;
    }
    // 每次都做完，但大半是半星 → 在赶时间，不是不用心
    const halfAll=ps.reduce((a,b)=>a+b.half,0), doneAll=ps.reduce((a,b)=>a+b.done,0);
    if(avg >= 1 && doneAll >= 4 && halfAll/doneAll > 0.7){
      out.push({ taskId:t.id, kind:"retime", tone:"info",
        title:t.name+" 都做完了，但多半是苦战/惨胜",
        body:"说明是在赶时间。把计划用时从 "+t.planMin+" 分钟放宽一点，或者换个更从容的时间段。",
        action:"放宽到 "+((t.planMin||15)+10)+" 分钟" });
    }
  }
  return out;
}
function applyHintState(taskId, kind){
  const t=ST.tasks.find(x=>x.id===taskId); if(!t) return null;
  settleLedger();                       // 改配置前先冻结历史
  if(kind==="lower") t.weekTarget=Math.max(1,weekTargetOf(t)-1);
  else if(kind==="retime") t.planMin=(t.planMin||15)+10;
  else if(kind==="switch") t.archived=true;
  ST.hintApplied[taskId]=TODAY();
  return t;
}

/* ---- 武将图鉴 & 招贤 ---- */
function heroOwned(name){ return !!ST.heroes[name]; }
function heroTotal(){ return ALL_HEROES.length; }
function heroOwnedCount(){ return ALL_HEROES.filter(h=>heroOwned(h.n)).length; }
function heroByName(name){ return ALL_HEROES.find(h=>h.n===name) || null; }
// 抽一位武将：未获得的权重加成，让集齐变得可能
function pickHero(){
  return pickWeighted(ALL_HEROES, h => HERO_W[h.tier] * (heroOwned(h.n) ? 1 : HERO_NEW_BOOST));
}
// 保底时从神将里挑，优先挑未获得的
function pickLegend(){
  return pickWeighted(ALL_HEROES.filter(h=>h.tier==="legend"), h => heroOwned(h.n) ? 3 : 10);
}
// 抽一个锦囊：先按档位总权重定档，再在档内均匀挑
function pickPrize(){
  const pool=ST.prizes;
  if(!pool.length) return null;
  const tiers=TIER_ORDER.map(t=>({ t, w:pool.filter(p=>p.tier===t).reduce((a,p)=>a+(p.weight||0),0) }))
    .filter(x=>x.w>0);
  if(!tiers.length) return pickOne(pool);
  const tier=pickWeighted(tiers, x=>x.w).t;
  return pickOne(pool.filter(p=>p.tier===tier));
}
function putInVault(p, from){
  if(!p) return null;
  const v={ uid:uid(), name:p.name, emoji:p.emoji||"🎁", tier:p.tier, merit:p.merit,
    redeemed:false, gotAt:TODAY(), from };
  ST.vault.push(v);
  return v;
}
// 还差几次触发保底
function pityLeft(){ return Math.max(0, PITY - ST.pity.sinceLegend); }
// 一次招贤（调用方负责扣招贤令）
function rollDraw(){
  const force = pityLeft() <= 0;
  if(force || Math.random()*100 < P_HERO){
    const h = force ? pickLegend() : pickHero();
    if(h.tier==="legend") ST.pity.sinceLegend = 0; else ST.pity.sinceLegend++;
    if(heroOwned(h.n)){
      const m=DUP_MERIT[h.tier]||6;
      ST.heroCount[h.n]=(ST.heroCount[h.n]||1)+1;
      ST.bonusMerit=round1(ST.bonusMerit+m);
      return { kind:"dup", hero:h, merit:m, forced:force };
    }
    ST.heroes[h.n]=TODAY();
    return { kind:"hero", hero:h, forced:force };
  }
  ST.pity.sinceLegend++;
  const p=pickPrize();
  putInVault(p,"draw");
  return { kind:"prize", prize:p };
}
// 出战：只能打今天的劲敌
function defeatBoss(){
  const d=TODAY();
  if(!dayIsComplete(d)) return { ok:false, reason:"军令未了，不可出战！" };
  if(bossBeaten(d)) return { ok:false, reason:"今日劲敌已破" };
  ST.bossDefeats[d]=true;
  const p=pickPrize();
  putInVault(p,"boss");
  return { ok:true, boss:BOSSES[dow(d)], prize:p };
}

/* ---- 毕业：连续若干完整周 100% 达成 → 视为已养成 ---- */
function checkGraduation(){
  const thisMon=weekStart(TODAY());
  return ST.tasks.filter(t=>{
    if(t.archived) return false;
    if(t.type==="flex" && weekTargetOf(t) < 2) return false;  // 周目标只有 1 次的不算习惯
    for(let i=1;i<=GRADUATE_WEEKS;i++){
      const s=taskWeekStat(t, addD(thisMon,-7*i));
      if(!s || s.pct<1) return false;
    }
    return true;
  });
}
function graduateTask(t){
  ST.graduated[t.id]={ name:t.name, emoji:t.emoji||"", subject:t.subject, at:TODAY(), weeks:GRADUATE_WEEKS };
  t.archived=true;
}
function ungraduate(taskId){
  if(!ST.graduated[taskId]) return;
  const t=ST.tasks.find(x=>x.id===taskId);
  if(t) t.archived=false;
  delete ST.graduated[taskId];
}

/* ---- 成就 ---- */
function calcAchievements(){
  const got={};
  const bosses=Object.keys(ST.bossDefeats).length;
  if(earnedMerit()>0) got.first_win=1;
  if(bosses>=1)  got.first_boss=1;
  if(bosses>=10) got.boss_hunter=1;
  if(totalMerit()>=500) got.merit500=1;

  let half=0, cnCnt=0;
  const subjOf={};
  for(const t of ST.tasks) subjOf[t.id]=t.subject;
  for(const L of Object.values(ST.ledger)) for(const t of (L.tasks||[])) if(!subjOf[t.id]) subjOf[t.id]=t.subject;
  for(const k in ST.records){
    const day=ST.records[k];
    for(const id in day){
      if(day[id].type==="half"||day[id].type==="poor") half++;
      if(isDone(day[id]) && subjOf[id]==="cn") cnCnt++;
    }
  }
  if(half>=20) got.half_hero=1;
  if(cnCnt>=50) got.cn50=1;

  // 连续点卯：有记录就算一天；也认「军令齐备」的连击
  const dates=Object.keys(ST.records).filter(d=>Object.keys(ST.records[d]).length).sort();
  let best=0, cur=0;
  for(let i=0;i<dates.length;i++){
    cur = (i>0 && addD(dates[i-1],1)===dates[i]) ? cur+1 : 1;
    if(cur>best) best=cur;
  }
  best=Math.max(best, currentStreak());
  if(best>=3) got.streak3=1;
  if(best>=7) got.streak7=1;

  // 完美一周：只认已经过完的整周（不然周一做完一天就拿到了）
  const thisMon=weekStart(TODAY());
  const weeks=new Set(Object.keys(ST.records).map(weekStart));
  for(const w of weeks){
    if(w>=thisMon) continue;
    let tot=0, done=0;
    for(const d of weekDates(w)){ const c=dayCounts(d); tot+=c.total; done+=c.done; }
    if(tot>0 && done>=tot){ got.perfect_week=1; break; }
  }
  // 满分一天：当天每一项都是完胜
  for(const d of Object.keys(ST.records)){
    const list=tasksForDate(d);
    if(list.length && list.every(t=>{ const r=rec(d,t.id); return r && r.type==="full"; })){ got.full_day=1; break; }
  }

  let changed=false;
  for(const k in got){ if(!ST.achievements[k]){ ST.achievements[k]=TODAY(); changed=true; } }
  return changed;
}

/* ---- 主线剧情：每周推进一回 ---- */
function storyNow(){
  const chapters=ST.story.chapters||[];
  const wk=Math.max(0, Math.floor(daysBetween(ST.story.startWeek||weekStart(TODAY()), weekStart(TODAY()))/7));
  const idx=chapters.length ? wk % chapters.length : 0;
  return { book:ST.story.book, chapters, idx, title:chapters[idx]||"" };
}

/* ---- 下一步提示：把「再做什么能得什么」说清楚 ---- */
function nextStepHint(){
  const t=TODAY();
  const br=isRestDay(t) ? activeBreak(t) : null;
  const { list, total, done } = dayCounts(t);
  const complete=total>0 && done>=total;
  const beaten=bossBeaten(t);
  const B=BOSSES[dow(t)];
  const rk=myRank();
  const cs=currentStreak();
  const late=couponOverdue().length;

  if(br) return { icon:"🍵", tone:"calm", rest:true,
    text:"休整中 · 到 "+fmtMD(br.to),
    sub:(br.reason||"休整")+"期间不派军令，连战天数已冻结不会断" };
  if(!list.length) return { icon:"🍵", tone:"calm", text:"今日无军令，好生歇息", sub:"顺手把上周军报补一补？" };
  if(!complete) return { icon:B.emoji, tone:"push",
    text:"再做 "+(total-done)+" 项军令即可破敌",
    sub: beaten ? "今日劲敌已破" : ("胜可得 🎟️×2 + 战利品 · "+B.name+"在"+B.place+"等着") };
  if(!beaten) return { icon:"⚔️", tone:"hot",
    text:"军令已齐，"+B.name+"就在"+B.place+"！",
    sub:"此时出战可再得 🎟️×2 和一个锦囊" };
  if(late>0) return { icon:"🎫", tone:"calm",
    text:"有 "+late+" 张兑现券还没兑现",
    sub:"今日已定 · 提醒大人开兑现台看看" };
  if(rk.next) return { icon:rk.next.e, tone:"calm",
    text:"再攒 "+round1(rk.next.s - rankMerit())+" 军功升「"+rk.next.n+"」",
    sub: cs>=3 ? ("已连战 "+cs+" 天 · "+streakName(cs)) : "今日已定，明日继续" };
  return { icon:"👑", tone:"calm", text:"已是汉中王，三分天下有其一", sub:"今日已定" };
}

/* ---- 一周汇总（点将台、一周、军报共用）----
   休整日不算进分母；未来的日子不算。 */
function weekSummary(anyDateInWeek){
  const days=weekDates(anyDateInWeek), today=TODAY();
  const s={ days, tot:0, done:0, full:0, half:0, poor:0, miss:0, minutes:0, merit:0, restDays:0, perTask:{} };
  for(const d of days){
    if(d>today) continue;
    s.merit+=dayMerit(d);
    if(isRestDay(d)){ s.restDays++; continue; }
    const list=tasksForDate(d);
    s.tot+=list.length;
    for(const t of list){
      const r=rec(d,t.id);
      if(isDone(r)) s.done++;
      if(r){
        if(s[r.type]!=null && r.type!=="skip") s[r.type]++;
        s.minutes+=r.minutes||0;
      }
      const pp=s.perTask[t.id]=s.perTask[t.id]||{ name:t.name, plan:0, act:0 };
      if(r && r.minutes){ pp.plan+=t.planMin||0; pp.act+=r.minutes; }
    }
  }
  s.merit=round1(s.merit);
  s.pct=pct(s.done,s.tot);
  return s;
}
