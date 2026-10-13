"use strict";
/* =====================================================================
   启动：读档 → 冻结历史 → 首屏 → 每日仪式 / 毕业典礼
   ===================================================================== */

/* ---- 毕业：庆祝 ---- */
function openGraduation(){
  const list=checkGraduation();
  if(!list.length) return false;
  settleLedger();
  for(const t of list) graduateTask(t);
  save();
  let h='<div class="ceremony-hero"><span class="ce">🎓</span><div class="cn">军令毕业</div></div>'
    + '<div class="sh-sub center">连续 '+GRADUATE_WEEKS+' 个完整周，这 '+list.length+' 项军令一次都没落下。<br>'
    + '它们已经是习惯了，从今天起移出每日清单。</div>';
  h+='<div class="ritual-list">';
  for(const t of list){
    const S=subjectOf(t.subject);
    h+='<div class="ritual-row"><span class="re">'+esc(t.emoji||S.icon)+'</span>'
      + '<span class="rn">'+esc(t.name)+'</span><span class="rp">'+S.place+' · 已养成</span></div>';
  }
  h+='</div>';
  h+='<div class="quote center">推着走的终点，是自己走。<br>这 '+list.length+' 项，你已经不用人推了。</div>';
  h+='<button class="btn jade block" onclick="closeSheet();render();">收下</button>';
  openSheet(h);
  confetti(150);
  return true;
}

/* ---- 每日首次打开的仪式卡 ---- */
function openRitual(){
  const t=TODAY();
  if(ST.lastOpen===t) return false;
  ST.lastOpen=t; save();
  const hint=nextStepHint();
  const list=tasksForDate(t);
  const cs=currentStreak();
  let h='<div class="ceremony-hero"><span class="ce">'+hint.icon+'</span>'
    + '<div class="cn">'+(hint.rest?"今日休整":"今日军令已下达")+'</div></div>'
    + '<div class="sh-sub center">'+fmtMD(t)+' · '+WD[dow(t)]+' · 共 <b>'+list.length+'</b> 项</div>';
  if(cs>=1){
    h+='<div class="nextbar '+(cs>=3?"hot":"calm")+'">'
      + '<span class="ni">🔥</span><span class="nt">'
      + '<span class="n1">已连战 '+cs+' 天'+(cs>=3?" · "+streakName(cs):"")+'</span>'
      + '<span class="n2">'+(cs>=3 ? ("今日军功 ×"+streakMult(cs)+"，别断了") : ("再连 "+(3-cs)+" 天起享军功加成"))+'</span>'
      + '</span></div>';
  }
  h+='<div class="ritual-list">';
  if(!list.length){
    h+='<div class="empty"><span class="ee">🍵</span>今日无军令</div>';
  }else{
    for(const x of list){
      const S=subjectOf(x.subject);
      h+='<div class="ritual-row"><span class="re">'+esc(x.emoji||S.icon)+'</span>'
        + '<span class="rn">'+esc(x.name)+'</span><span class="rp">'+S.place+' · '+(x.planMin||0)+'′</span></div>';
    }
  }
  h+='</div>';
  h+='<div class="ritual-hint"><b>'+esc(hint.text)+'</b><span>'+esc(hint.sub)+'</span></div>';
  h+='<button class="btn block" onclick="closeSheet();render();">'+(list.length?"开始点卯":"知道了")+'</button>';
  openSheet(h);
  return true;
}

// 应用开着过了午夜：日期变了就重新结算、回到新的今天
let BOOT_DAY=null;
function onDayMaybeChanged(){
  const t=TODAY();
  if(t===BOOT_DAY) return;
  const wasToday = VIEW_DATE===BOOT_DAY;
  BOOT_DAY=t;
  applySkin();
  const changed=settleLedger();
  if(calcAchievements()||changed) save();
  if(wasToday) VIEW_DATE=t;
  render();
  if(!$(".mask") && storageAvailable() && !openGraduation()) openRitual();
}

(function init(){
  ST=load();
  if(!ST){ ST=defaultState(); save(); }
  BOOT_DAY=TODAY();
  VIEW_DATE=BOOT_DAY;
  applySkin();
  checkStorage();      // 存不住的话，先把话说清楚
  // 先把历史上还没结算的日子冻住，之后改任务都不会再改写它们
  const settled=settleLedger();
  if(calcAchievements()||settled) save();

  $("#tabs").addEventListener("click",e=>{
    const b=e.target.closest("button[data-view]"); if(!b) return;
    // 周、军报、点将台都从本周看起；今日从今天看起
    switchView(b.dataset.view, TODAY());
  });
  $("#btnDraw").addEventListener("click",openDraw);
  document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeSheet(); });
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden) onDayMaybeChanged(); });
  setInterval(onDayMaybeChanged, 60*1000);
  render();

  // 离线：只有通过 http(s) 打开时才注册（file:// 不支持 service worker，静默跳过）
  try{
    if("serviceWorker" in navigator && /^https?:$/.test(location.protocol))
      navigator.serviceWorker.register("sw.js").catch(()=>{});
  }catch(e){}

  // 每日首次打开：先看有没有任务毕业，再给一张今日仪式卡
  // 存不住的时候不弹，让告警条先被看见
  setTimeout(()=>{
    if(!storageAvailable()) return;
    if(!openGraduation()) openRitual();
  }, 260);
})();
