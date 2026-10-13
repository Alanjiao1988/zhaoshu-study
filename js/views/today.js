"use strict";
/* =====================================================================
   视图：今日 —— 日期条、下一步、主线、四军营地、今日军令、破敌、结算
   ===================================================================== */

function dayBarHTML(d){
  let h='<div class="daybar">';
  for(const dd of weekDates(d)){
    const done=isCompleteOn(dd);
    const hasRec=!!ST.records[dd];
    const cls=[ dd===d?"active":"", dd===TODAY()?"today":"", dd>TODAY()?"future":"" ].join(" ").trim();
    h+='<button class="'+cls+'" onclick="gotoDate(\''+dd+'\')" aria-label="'+fmtMD(dd)+'">'
     + '<div class="dw">'+WDX[dow(dd)]+'</div>'
     + '<div class="dd">'+parseD(dd).getDate()+'</div>'
     + '<div class="mark">'+(isRestDay(dd)?"🍵":(done?"✅":(hasRec?"◐":"&nbsp;")))+'</div>'
     + '</button>';
  }
  return h+'</div>';
}

function storyCardHTML(){
  const s=storyNow(), n=s.chapters.length;
  return '<div class="story-card">'
    + '<div class="chap-no">'+(n?s.idx+1:"")+'</div>'
    + '<div class="sc-top">📜 主线 · 《'+esc(s.book||"—")+'》</div>'
    + '<div class="sc-no">'+(n?"第 "+cnNum(s.idx+1)+" 回":"")+'</div>'
    + '<div class="sc-title">'+esc(n?s.title:"去设置里挑一本主线书吧")+'</div>'
    + '<div class="sc-bar"><i style="width:'+pct(n?s.idx+1:0,n)+'%"></i></div>'
    + '<div class="sc-foot"><span>已推进 '+(n?s.idx+1:0)+' / '+n+' 回</span><span>每周一回</span></div>'
    + '</div>';
}

function zonesHTML(d){
  const todayList=tasksForDate(d);
  let h='<div class="card"><div class="card-head"><h3>四军营地</h3><span class="hint">本周进度</span></div><div class="zones">';
  for(const sk of SUBJ_ORDER){
    const S=SUBJECTS[sk];
    const todayN=todayList.filter(t=>t.subject===sk).length;
    let tot=0, done=0;
    for(const t of ST.tasks){
      if(t.archived||t.subject!==sk) continue;
      if(t.type==="flex"){
        const target=weekTargetOf(t);
        tot+=target; done+=Math.min(weekDone(t.id,d),target);
        continue;
      }
      for(const x of weekDates(d)){
        if(x>TODAY() || isRestDay(x) || !appearsOn(t,x)) continue;
        tot++; if(doneOn(x,t.id)) done++;
      }
    }
    h+='<div class="zone">'
     + '<div class="zt"><span>'+S.icon+'</span><span class="zz">'+S.place+'</span><span class="zv">'+(tot?done+"/"+tot:"—")+'</span></div>'
     + '<div class="zbar"><i style="width:'+pct(done,tot)+'%;background:'+S.color+'"></i></div>'
     + '<div class="zr">'+(tot?(todayN?("今日 "+todayN+" 项 · "):"今日无事 · ")+S.role:"本营暂无军令")+'</div>'
     + '</div>';
  }
  return h+'</div></div>';
}

function taskCardHTML(t,d){
  const r=rec(d,t.id);
  const S=subjectOf(t.subject);
  const cls=["task-card","s-"+t.subject];
  if(isDone(r)) cls.push("done");
  if(t.boss) cls.push("boss");
  let meta='<span>⏱ 计划 '+(t.planMin||0)+' 分钟</span>';
  if(t.type==="flex"){
    const target=weekTargetOf(t), doneW=weekDone(t.id,d), left=Math.max(0,target-doneW);
    meta+='<span>本周 '+doneW+'/'+target+'</span>';
    if(!isDone(r) && left>0) meta+='<span class="rem">尚需 '+left+' 次</span>';
  }
  if(r && r.minutes) meta+='<span>实际 '+r.minutes+' 分钟</span>';
  let badge;
  if(!r) badge='<span class="dot-empty"></span>';
  else if(r.type==="full") badge='<span class="star-badge">⭐ 完胜</span>';
  else if(r.type==="half") badge='<span class="star-badge half">◑ 苦战</span>';
  else if(r.type==="poor") badge='<span class="star-badge poor">◐ 惨胜</span>';
  else if(r.type==="skip") badge='<span class="star-badge zero">🏳️ 免战</span>';
  else badge='<span class="star-badge zero">✕ 未战</span>';
  return '<button class="'+cls.join(" ")+'" onclick="openCheck(\''+t.id+'\',\''+d+'\')">'
    + '<span class="tc-emoji">'+(t.emoji||S.icon)+'</span>'
    + '<span class="tc-body"><span class="tc-title">'+esc(t.name)
    + '<span class="tag">'+S.place+'</span>'
    + (t.boss?'<span class="tag boss">⚔ 硬仗</span>':'')
    + '</span><span class="tc-meta">'+meta+'</span></span>'
    + '<span class="tc-right">'+badge+'</span>'
    + '</button>';
}

function bossCardHTML(d, counts, isToday){
  const B=BOSSES[dow(d)];
  const beaten=bossBeaten(d);
  const { total, done } = counts;
  const hp=Math.round((1-(total?done/total:1))*100);
  let sub;
  if(beaten) sub="今日劲敌已破，战利品入库。";
  else if(!total) sub="今日无军令，劲敌不至。";
  else if(!isToday) sub=(done>=total?"这一天军令齐备。":"这一天尚余 "+(total-done)+" 项军令未了。")+" 劲敌只在当日应战。";
  else sub="尚余 "+(total-done)+" 项军令未了。 "+esc(B.desc);
  if(isToday && !beaten && total && done>=total) sub="军令已齐，正是出战之时！";
  let h='<div class="boss-card'+(beaten?" beaten":"")+'">'
    + '<div class="boss-top">'
    + '<div class="boss-face'+(beaten?" dead":"")+'">'+(beaten?"🏳️":B.emoji)+'</div>'
    + '<div class="boss-info"><div class="boss-name">'+esc(B.name)+(beaten?" · 已破":"")+'</div>'
    + '<div class="boss-place">📍 '+esc(B.place)+' · '+WD[dow(d)]+'</div>'
    + '<div class="boss-sub">'+sub+'</div></div>'
    + '</div>';
  if(!beaten && total && isToday){
    const canHit = done>=total;
    h+='<div class="hp-wrap"><i style="width:'+hp+'%"></i><b>气势 '+hp+'%</b></div>'
     + '<div class="boss-foot">'
     + '<button class="btn '+(canHit?"gold":"ghost")+'" '+(canHit?"":"disabled")+' onclick="attackBoss()">'+(canHit?"⚔️ 出战":"军令未了，不可出战")+'</button>'
     + '<span class="bf-note">胜可得 🎟️×2 + 战利品</span>'
     + '</div>';
  }
  return h+'</div>';
}

function viewToday(){
  const d=VIEW_DATE;
  const isToday = d===TODAY();
  const wd=dow(d);
  const rest=isRestDay(d);
  const counts=dayCounts(d);
  const { list, total, done } = counts;

  let html=dayBarHTML(d);
  html+='<div class="dayhead"><h2>'+WD[wd]+' · '+fmtMD(d)+'</h2>'
      + (isToday?'<span class="hint">今日</span>':'<button class="btn ghost sm" onclick="gotoDate(\''+TODAY()+'\')">回到今日</button>')
      + '</div>';

  // 忘了点卯的那天，趁还在窗口里补上；更早的说清楚只读
  if(!isToday && d<TODAY()){
    if(canBackfill(d)){
      const left=total-done;
      if(left>0) html+='<div class="holiday-row warm">✍️ 这一天还可以补录 —— 还有 '+left+' 项没点卯</div>';
    }else if(frozenSheet(d)){
      html+='<div class="holiday-row">🔒 这一天的账已结算入账，只能查看</div>';
    }
  }

  // 下面几块分成左右两栏：左栏是军令清单，右栏是提示、主线、劲敌、结算、营地。
  // iPad 横屏并排显示；竖屏变成单栏，按 .o1~.o6 的顺序排（见 style.css 的 .today-grid）
  let top="", side="", tasks="";

  // ===== 下一步（只在看今天时显示，永远告诉孩子「再做什么能得什么」）=====
  if(isToday){
    const hint=nextStepHint();
    const cs=currentStreak();
    top+='<div class="nextbar '+hint.tone+'">'
        + '<span class="ni">'+hint.icon+'</span>'
        + '<span class="nt"><span class="n1">'+esc(hint.text)+'</span>'
        + '<span class="n2">'+esc(hint.sub)+'</span></span>'
        + (cs>=3 ? '<span class="nstreak">🔥 连战 '+cs+' 天 ×'+streakMult(cs)+'</span>' : '')
        + '</div>';
    // 休整期里留一个自愿的出口 —— 这个动作本身就是最干净的主动性信号
    if(hint.rest){
      top+='<div class="card center">'
          + '<p class="muted">休整就是休整，不用做任何事。<br>但如果今天特别想做一点，也可以。</p>'
          + '<button class="btn jade" onclick="openExtraDay()">✋ 今天想做一点</button></div>';
    }
  }


  // ===== 今日军令 =====
  tasks+='<div class="card"><div class="card-head"><h3>'+(isToday?"今日军令":"当日军令")+'</h3>'
      + '<span class="hint">'+(total?done+"/"+total+" 已点卯":"—")+'</span></div>';
  if(!total){
    tasks+= rest
      ? '<div class="empty"><span class="ee">🍵</span>休整中 · '+esc(restReason(d))+'<br><small>这段时间不派军令，连战天数已冻结</small></div>'
      : '<div class="empty"><span class="ee">🍵</span>今日无军令，好生歇息</div>';
  }else{
    const known=new Set(TIME_SLOTS.map(s=>s[0]));
    for(const [key,label] of TIME_SLOTS){
      const sub=list.filter(t=>(known.has(t.timeSlot)?t.timeSlot:"any")===key);
      if(!sub.length) continue;
      tasks+='<div class="slot-label">'+label+'</div>';
      for(const t of sub) tasks+=taskCardHTML(t,d);
    }
  }
  // 孩子的口子：自己想加就加，不用等批
  if(isToday && !rest) tasks+='<button class="addrow" onclick="openKidAdd()"><span>➕</span> 再给我加一项</button>';
  const hol=holidayTasks(d);
  if(hol.length){
    tasks+='<div class="divider"></div>';
    for(const t of hol) tasks+='<div class="holiday-row">✓ '+esc(t.name)+' 本周军令已达成，余日休整</div>';
  }
  tasks+='</div>';

  // 休整日不出现劲敌，也不谈结算
  const cs = isToday ? currentStreak() : 0;
  if(rest){
    side='<div class="card center">'
        + '<div class="strong">🍵 今日休整</div>'
        + '<p class="muted">休整期间不结算完成度，连战天数也冻结着。<br>'
        + (cs>0 ? ('已连战 '+cs+' 天，等你回来接着数。') : '等你回来再接着数。')+'</p></div>';
    return html+todayGrid(top, tasks, side, d);
  }

  side+=bossCardHTML(d, counts, isToday);

  // ===== 结算 =====
  const complete = total>0 && done>=total;
  const ratio = total ? done/total : 1;
  const mult = complete ? streakMult(cs) : 1;
  side+='<div class="card"><div class="card-head"><h3>'+(isToday?"今日结算":"当日结算")+'</h3>'
      + '<span class="hint">'+(complete?"军令齐备，已得招贤令 🎟️":"军令齐备可得招贤令 🎟️")+'</span></div>'
      + '<div class="prog"><i style="width:'+Math.round(ratio*100)+'%"></i></div>'
      + '<div class="row-between"><span>完成度 '+Math.round(ratio*100)+'%</span><span>军功 ⭐'+dayMerit(d)+'</span></div>'
      + (mult>1 ? '<div class="streak-note hot">🔥 连战 '+cs+' 天 · 今日军功 ×'+mult+'（'+streakName(cs)+'）</div>' : '')
      + (isToday && cs<3 ? '<div class="streak-note">'+(cs>0?'连战 '+cs+' 天 · ':'')+'再连 '+(3-cs)+' 天起享军功加成</div>' : '')
      + '</div>';
  return html+todayGrid(top, tasks, side, d);
}
// 左栏：军令；右栏：提示 → 主线 → 劲敌/结算 → 营地。单栏时按 o1..o5 排成：提示、主线、营地、军令、劲敌/结算
function todayGrid(top, tasks, side, d){
  return '<div class="today-grid">'
    + '<div class="tg-col tg-main"><div class="o4">'+tasks+'</div></div>'
    + '<div class="tg-col tg-side">'
    + (top?'<div class="o1">'+top+'</div>':'')
    + '<div class="o2">'+storyCardHTML()+'</div>'
    + '<div class="o5">'+side+'</div>'
    + '<div class="o3">'+zonesHTML(d)+'</div>'
    + '</div></div>';
}
VIEWS.today = viewToday;

function gotoDate(d){ VIEW_DATE=d; switchView("today"); }

/* =====================================================================
   点卯弹窗
   ===================================================================== */
function checkHeadHTML(t,dateStr){
  const S=subjectOf(t.subject);
  return '<h3>'+esc(t.name)+'</h3><div class="sh-sub">'+S.icon+' '+S.place+' · '+fmtMD(dateStr)+'（'+WD[dow(dateStr)]+'）</div>';
}
function openCheck(taskId,dateStr){
  const L=frozenSheet(dateStr);
  const t=ST.tasks.find(x=>x.id===taskId) || (L && (L.tasks||[]).find(x=>x.id===taskId));
  if(!t) return;
  const r=rec(dateStr,taskId)||{};

  // 已经结算入账的历史日子只读；最近 BACKFILL_DAYS 天还开着，忘了点可以补
  if(L || dateStr>TODAY()){
    const R=RESULTS[r.type];
    const cls = r.type==="full"?"t-legend":(isDone(r)?"t-rare":"t-normal");
    let h=checkHeadHTML(t,dateStr);
    h+='<div class="result-box '+cls+'"><div class="re">'+(R?R.e:"·")+'</div>'
      + '<div class="rn">'+(R?R.n:"未记录")+'</div>'
      + '<div class="rt">'+(r.minutes?("实际用时 "+r.minutes+" 分钟"):"未填实际用时")+'</div></div>';
    h+= L
      ? '<div class="quote">这一天的账已经结算入账了，不能再改动 ——「不追究前日之失」，也不能回头改写前日之功。<br>（只能补录最近 '+BACKFILL_DAYS+' 天）</div>'
      : '<div class="quote">这一天还没到，到了再来点卯。</div>';
    h+='<button class="btn ghost block" onclick="closeSheet()">知道了</button>';
    openSheet(h);
    return;
  }

  const types = t.type==="flex" ? ["full","half","poor","miss","skip"] : ["full","half","poor","miss"];
  let h=checkHeadHTML(t,dateStr);
  for(const k of types){
    const o=RESULTS[k];
    h+='<button class="opt'+(r.type===k?" sel":"")+'" data-k="'+k+'"><span class="oe">'+o.e+'</span>'
      + '<span class="ob"><span class="ot">'+(k==="skip"?"高挂免战牌":o.n)+'</span><span class="od">'+o.d+'</span></span>'
      + '<span class="os">'+(o.level?"⭐ "+o.level.toFixed(1):"—")+'</span></button>';
  }
  h+='<div class="divider"></div>'
   + '<div class="field"><label for="actMin">实际用时（分钟，可留空）</label>'
   + '<input type="number" id="actMin" min="0" max="600" inputmode="numeric" placeholder="计划 '+(t.planMin||0)+' 分钟" value="'+(r.minutes||"")+'"></div>'
   + '<div class="grid2"><button class="btn ghost" onclick="closeSheet()">取消</button>'
   + '<button class="btn" id="okBtn">'+(r.type?"更新点卯":"确定")+'</button></div>';
  if(r.type) h+='<button class="btn danger block" onclick="clearRec(\''+taskId+'\',\''+dateStr+'\')">撤销点卯</button>';
  // 孩子的口子：觉得这项太难，可以直接说出来
  h+='<button class="addrow" onclick="markTooHard(\''+taskId+'\')">🤔 这项对我来说太难了</button>';

  openSheet(h,(sheet)=>{
    let picked = r.type||null;
    $$(".opt",sheet).forEach(b=>b.onclick=()=>{
      picked=b.dataset.k;
      $$(".opt",sheet).forEach(x=>x.classList.toggle("sel", x===b));
    });
    $("#okBtn",sheet).onclick=()=>{
      if(!picked){ toast("先选一下今日战况"); return; }
      const mins=Math.max(0, parseInt($("#actMin",sheet).value||"0",10)||0);
      const before=dayIsComplete(dateStr);
      setRec(dateStr,taskId,picked,mins);
      const after=dayIsComplete(dateStr);
      // 飘字：从被点的那个选项位置飞出来
      const anchor=$(".opt.sel",sheet)||sheet;
      const lv=RESULTS[picked].level;
      if(lv) floatFromEl(anchor,RESULTS[picked].e+" +"+lv,true);
      else if(picked==="skip") floatFromEl(anchor,"🏳️",false);
      calcAchievements(); save(); closeSheet(); render();
      const msg={ full:"好，完胜一场 ⭐", half:"苦战也算数，这份力没有白费 ◑",
        poor:"惨胜也是胜，先把旗子插上 ◐", skip:"免战牌已挂，顺延到本周之后 🏳️" }[picked];
      if(msg) toast(msg);
      if(!before && after){
        confetti(60);
        const cs=streakEndingAt(dateStr);
        toast(cs>=3
          ? ("🎉 军令齐备，招贤令 +1！连战 "+cs+" 天 · "+streakName(cs)+" ×"+streakMult(cs))
          : "🎉 军令齐备，招贤令 +1！",2800);
      }
    };
  });
}
function clearRec(taskId,dateStr){
  if(frozenSheet(dateStr)){
    closeSheet(); toast("这一天的账已结算入账，不能再改动（只能补录最近 "+BACKFILL_DAYS+" 天）");
    return;
  }
  setRec(dateStr,taskId,null);
  closeSheet(); commit(); toast("已撤销这天的点卯");
}

/* =====================================================================
   孩子的口子：三个按钮，零审批，点了就生效
   ===================================================================== */
function openExtraDay(){
  openSheet(
    '<div class="ceremony-hero"><span class="ce">✋</span><div class="cn">今天想做一点</div></div>'
    + '<div class="sh-sub center">休整期本来是让你歇着的。<br>如果你今天自己想做，那就把军令请出来。</div>'
    + '<div class="quote center">这一条会被记进军报，大人看得到 ——「休整期里主动开工」。</div>'
    + '<div class="grid2"><button class="btn ghost" onclick="closeSheet()">还是歇着吧</button>'
    + '<button class="btn jade" id="exOk">请出军令</button></div>',
    (sheet)=>{
      $("#exOk",sheet).onclick=()=>{
        markExtraDay(TODAY());
        closeSheet(); commit();
        toast("军令已请出 —— 这一条记你主动 ✋",2800);
      };
    }
  );
}
function openKidAdd(){
  let h='<h3>再给我加一项</h3><div class="sh-sub">你自己加的任务，会直接出现在今日军令里。<br>大人会在军报上看到是你加的。</div>';
  h+='<div class="field"><label for="kName">想加什么？</label><input type="text" id="kName" placeholder="例：多读一章三国演义" maxlength="16"></div>';
  h+='<div class="field"><label>属于哪个营地</label><div class="chipsel" id="kSubj">';
  for(const k of SUBJ_ORDER) h+='<button data-v="'+k+'" class="'+(k==="cn"?"on":"")+'">'+SUBJECTS[k].icon+' '+SUBJECTS[k].place+'</button>';
  h+='</div></div>';
  h+='<div class="field"><label>打算每周做几次</label><div class="chipsel" id="kTimes">';
  [1,2,3,5,7].forEach(n=>h+='<button data-v="'+n+'" class="'+(n===3?"on":"")+'">'+n+' 次</button>');
  h+='</div></div>';
  h+='<div class="grid2"><button class="btn ghost" onclick="closeSheet()">算了</button><button class="btn" id="kOk">加上</button></div>';
  openSheet(h,(sheet)=>{
    bindChips(sheet,"#kSubj"); bindChips(sheet,"#kTimes");
    $("#kOk",sheet).onclick=()=>{
      const name=$("#kName",sheet).value.trim();
      if(!name){ toast("先想想要加什么"); return; }
      const subj=chipVal(sheet,"#kSubj")||"other";
      settleLedger();
      ST.tasks.push({ id:uid(), name, subject:subj, type:"flex", emoji:SUBJECTS[subj].icon,
        timeSlot:"any", planMin:15, weekTarget:parseInt(chipVal(sheet,"#kTimes"),10)||3,
        weekdays:[0,1,2,3,4,5,6], boss:false, archived:false, fromKid:true });
      logSignal("add_task", name);
      closeSheet(); commit(); confetti(70);
      toast("「"+name+"」已加入今日军令 ✓",2800);
    };
  });
}
function markTooHard(taskId){
  const t=ST.tasks.find(x=>x.id===taskId); if(!t) return;
  logSignal("too_hard", t.name);
  closeSheet(); commit();
  toast("记下了 —— 大人会在军报上看到「"+t.name+"太难」",3000);
}

/* =====================================================================
   破敌
   ===================================================================== */
function attackBoss(){
  const res=defeatBoss();
  if(!res.ok){ toast(res.reason); return; }
  calcAchievements(); save(); refreshTop();
  confetti(110);
  const B=res.boss, p=res.prize;
  let h='<div class="draw-stage"><div class="draw-roll still">🏳️</div></div>'
    + '<h3 class="center">破了 '+esc(B.name)+'！</h3>'
    + '<div class="sh-sub center">'+esc(B.place)+' 一战，'+esc(B.name)+' 已退</div>'
    + '<div class="result-box t-legend"><div class="re">🎟️🎟️</div><div class="rn">招贤令 ×2</div>'
    + '<div class="rt">战利品已入锦囊匣</div>'
    + (p?('<div class="rc">'+(p.emoji||"🎁")+' '+esc(p.name)+'</div>'):'')
    + '</div>'
    + '<button class="btn block" onclick="closeSheet();render();">收下战利品</button>';
  openSheet(h);
  render();
}
