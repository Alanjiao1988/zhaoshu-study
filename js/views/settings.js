"use strict";
/* =====================================================================
   视图：设置 —— 基本信息、主线书目、军令、锦囊、休整期、数据管理、玩法说明
   ===================================================================== */

function taskTypeText(t){
  if(t.type==="daily") return "每日必做";
  if(t.type==="flex") return "灵活安排（每周 "+weekTargetOf(t)+" 次）";
  return "固定日期（"+WD_VIEW.filter(x=>(t.weekdays||[]).includes(x)).map(x=>WDX[x]).join("")+"）";
}

function viewSettings(){
  let h='<div class="card"><div class="card-head"><h3>基本设置</h3></div>';
  h+='<div class="field"><label for="sChild">主公的名字</label><input type="text" id="sChild" value="'+esc(ST.childName)+'" placeholder="主公" maxlength="10"></div>';
  h+='<div class="grid2">'
   + '<div class="field"><label for="sSeason">赛季名称</label><input type="text" id="sSeason" value="'+esc(ST.season.name)+'"></div>'
   + '<div class="field"><label for="sSeasonEnd">赛季结束日</label><input type="date" id="sSeasonEnd" value="'+esc(ST.season.endDate)+'"></div>'
   + '</div>';
  h+='<button class="btn block" onclick="saveBasic()">保存</button></div>';

  h+='<div class="card"><div class="card-head"><h3>主线书目</h3><span class="hint">每周自动推进一回</span></div>';
  h+='<div class="field"><label for="sBook">从书库中选（内置书库）</label><select id="sBook">';
  for(const b in BOOKS) h+='<option value="'+esc(b)+'"'+(ST.story.book===b?" selected":"")+'>'+esc(b)+'（'+BOOKS[b].length+' 回）</option>';
  h+='<option value="__custom"'+(BOOKS[ST.story.book]?"":" selected")+'>自定义书目</option>';
  h+='</select></div>';
  h+='<div class="field"><label for="sBookName">书名</label><input type="text" id="sBookName" value="'+esc(ST.story.book)+'"></div>';
  h+='<div class="field"><label for="sChaps">回目列表（每行一回）</label><textarea id="sChaps" class="tall">'+esc((ST.story.chapters||[]).join("\n"))+'</textarea></div>';
  h+='<div class="grid2"><button class="btn ghost" onclick="loadBookChap()">载入所选书目</button><button class="btn" onclick="saveStory()">保存</button></div>';
  h+='<button class="btn ghost block sm" onclick="restartStory()">从第一回重新开始</button>';
  h+='</div>';

  h+='<div class="card"><div class="card-head"><h3>军令管理</h3><button class="btn sm" onclick="openTaskEdit()">+ 新增</button></div>';
  const act=ST.tasks.filter(t=>!t.archived);
  if(!act.length) h+='<div class="empty"><span class="ee">📋</span>还没有军令，点右上角新增</div>';
  for(const t of act){
    const S=subjectOf(t.subject);
    h+='<div class="setrow"><span class="si">'+esc(t.emoji||S.icon)+'</span>'
     + '<span class="sn">'+esc(t.name)+(t.boss?' <span class="mini-tag">硬仗</span>':'')+(t.fromKid?' <span class="mini-tag jade">孩子加的</span>':'')
     + '<small>'+S.place+' · '+taskTypeText(t)+' · 计划 '+(t.planMin||0)+' 分钟</small></span>'
     + '<button class="btn ghost sm" onclick="openTaskEdit(\''+t.id+'\')">改</button></div>';
  }
  const paused=ST.tasks.filter(t=>t.archived && !ST.graduated[t.id]);
  if(paused.length){
    h+='<div class="divider"></div><div class="subhead">已暂停</div>';
    for(const t of paused){
      h+='<div class="setrow faded"><span class="si">'+esc(t.emoji||subjectOf(t.subject).icon)+'</span>'
       + '<span class="sn">'+esc(t.name)+'<small>'+taskTypeText(t)+'</small></span>'
       + '<button class="btn ghost sm" onclick="resumeTask(\''+t.id+'\')">恢复</button></div>';
    }
  }
  h+='</div>';

  h+='<div class="card"><div class="card-head"><h3>锦囊内容</h3><button class="btn sm" onclick="openPrizeEdit()">+ 新增</button></div>';
  h+='<p class="muted">和孩子一起商量着填。权重越大越容易抽到。</p>';
  h+=prizeTableHTML(true);
  h+='</div>';

  // ===== 休整期 =====
  h+='<div class="card"><div class="card-head"><h3>休整期</h3><button class="btn sm" onclick="openBreakEdit()">+ 新增</button></div>';
  h+='<p class="muted">休整期间不派军令，<b>连战天数冻结不会断</b>，也不算进完成率。<br>'
   + '生病、寒暑假、考试周都该歇着 —— 这个工具得承认这件事。</p>';
  const brk=ST.breaks.slice().sort((a,b)=>a.from<b.from?1:-1);
  if(!brk.length){
    h+='<div class="empty"><span class="ee">🍵</span>还没有休整期</div>';
  }else{
    const t=TODAY();
    for(const b of brk){
      const on = t>=b.from && t<=b.to, past = b.to < t;
      h+='<div class="breakrow'+(on?" on":"")+'">'
       + '<span class="si">'+(on?"🍵":(past?"✓":"🕒"))+'</span>'
       + '<span class="bn">'+esc(b.reason||"休整")+(on?' <span class="ok small">进行中</span>':"")
       + '<small>'+b.from+' ~ '+b.to+' · 共 '+(daysBetween(b.from,b.to)+1)+' 天</small></span>'
       + (b.to>=backfillFloor()
          ? '<button class="btn ghost sm" onclick="openBreakEdit(\''+b.id+'\')">改</button>'
          : '<span class="muted small">已入账</span>')
       + '</div>';
    }
  }
  h+='</div>';

  h+='<div class="card"><div class="card-head"><h3>数据管理</h3></div>';
  h+='<div class="setrow"><span class="si">📤</span><span class="sn">导出备份<small>下载一个 json 文件，换设备或换浏览器时用</small></span>'
   + '<button class="btn ghost sm" onclick="exportData()">导出</button></div>';
  h+='<div class="setrow"><span class="si">📥</span><span class="sn">导入备份<small>会覆盖当前全部数据，请谨慎</small></span>'
   + '<button class="btn ghost sm" onclick="document.getElementById(\'impFile\').click()">选择文件</button>'
   + '<input type="file" id="impFile" accept=".json,application/json" hidden onchange="importData(this)"></div>';
  h+='<div class="setrow"><span class="si">🧪</span><span class="sn">造点示例数据<small>清空点卯记录，给过去 20 天随机生成，方便先看效果</small></span>'
   + '<button class="btn ghost sm" onclick="seedDemo()">生成</button></div>';
  h+='<div class="setrow"><span class="si">🎟️</span><span class="sn">补发招贤令<small>想立刻试试揭榜时用，每次补 3 枚</small></span>'
   + '<button class="btn ghost sm" onclick="grantTickets(3)">补发</button></div>';
  h+='<div class="setrow"><span class="si">🗑️</span><span class="sn">清空全部数据<small>恢复出厂设置，不可撤销</small></span>'
   + '<button class="btn danger sm" onclick="resetAll()">清空</button></div>';
  h+='</div>';

  h+='<div class="card"><div class="card-head"><h3>玩法说明</h3></div><ul class="rules">'
   + '<li>每天完成<b>全部</b>军令 → 得 1 枚招贤令 🎟️</li>'
   + '<li>破了当日劲敌 → 再得 2 枚招贤令 + 一个锦囊</li>'
   + '<li><b>连战加成</b>：连续 3 天起军功 ×1.2，5 天 ×1.5，7 天 ×2</li>'
   + '<li><b>保底</b>：连揭 '+PITY+' 榜未遇神将，下一榜必出，进度在武将页可见</li>'
   + '<li>招贤榜有名将卡与锦囊两种，名将卡永久入图鉴；重复抽到的名将折算为军功</li>'
   + '<li>灵活类军令没做完不会记「欠债」，只提示「尚需几次」；实在赶不及，可「高挂免战牌」</li>'
   + '<li>苦战、惨胜都算半个军功——拼过的力气不该被清零</li>'
   + '<li><b>毕业</b>：某项军令连续 '+GRADUATE_WEEKS+' 个完整周 100% 达成，自动移入「已养成」</li>'
   + '<li><b>兑现台</b>：开了锦囊不等于拿到手，大人点「已兑现」才算结账</li>'
   + '<li><b>休整期</b>：生病、假期、考试周可以停，连战天数冻结不会断</li>'
   + '<li><b>调整建议</b>：某项连续做不完，军报会主动建议降目标</li>'
   + '</ul>'
   + '<div class="quote">「不追究前日之失，只论当下可用之兵。」</div>'
   + '<div class="quote">历史账目一经结算即冻结：改任务、删军令都不会动到已经发给孩子的军功和招贤令。'
   + '最近 '+BACKFILL_DAYS+' 天（含今天）还没冻结，忘了点卯可以补上。</div>'
   + '<div class="quote">完成率可以靠推，主动推不出来。军报里那个「本周孩子主动做的事」才是这套系统真正该看的数字。</div>'
   + '</div>';
  h+='<div class="verline">少年主公 v'+APP_VERSION+' · 数据结构 v'+SCHEMA+' · 建于 '+esc(ST.createdAt||"—")+'</div>';
  return h;
}
VIEWS.settings = viewSettings;

/* ---- 基本 & 主线 ---- */
function saveBasic(){
  ST.childName=$("#sChild").value.trim()||"主公";
  ST.season.name=$("#sSeason").value.trim()||"第 1 赛季";
  const e=$("#sSeasonEnd").value.trim();
  if(isDateStr(e)) ST.season.endDate=e;
  commit(); toast("已保存 ✓");
}
function loadBookChap(){
  const b=$("#sBook").value;
  if(b==="__custom"){ toast("自定义书目请直接在下面填写回目"); return; }
  $("#sBookName").value=b;
  $("#sChaps").value=BOOKS[b].join("\n");
  toast("已载入《"+b+"》共 "+BOOKS[b].length+" 回，记得点保存");
}
function saveStory(){
  const name=$("#sBookName").value.trim()||"未命名";
  const chaps=$("#sChaps").value.split("\n").map(s=>s.trim()).filter(Boolean);
  if(!chaps.length){ toast("至少要有一回"); return; }
  // 换了一本书就从第一回开始
  if(name!==ST.story.book) ST.story.startWeek=weekStart(TODAY());
  ST.story.book=name; ST.story.chapters=chaps;
  commit(); toast("主线已更新 📜");
}
function restartStory(){
  if(!confirm("主线从第一回重新开始？")) return;
  ST.story.startWeek=weekStart(TODAY());
  commit(); toast("已回到第一回");
}

/* ---- 军令 ---- */
function openTaskEdit(id){
  const t = id ? ST.tasks.find(x=>x.id===id) : {
    name:"", subject:"cn", type:"flex", emoji:"", timeSlot:"any",
    planMin:15, weekTarget:3, weekdays:[1,3,5], boss:false
  };
  if(!t) return;
  const isNew=!id;
  let h='<h3>'+(isNew?"新增军令":"编辑军令")+'</h3><div class="sh-sub">名字短一点，孩子一眼能看懂</div>';
  h+='<div class="field"><label for="tName">军令名</label><input type="text" id="tName" value="'+esc(t.name)+'" placeholder="例：英语磨耳朵" maxlength="16"></div>';
  h+='<div class="grid2"><div class="field"><label for="tEmoji">图标 emoji</label><input type="text" id="tEmoji" value="'+esc(t.emoji||"")+'" placeholder="🎧"></div>'
   + '<div class="field"><label for="tMin">计划用时（分钟）</label><input type="number" id="tMin" min="1" max="300" value="'+(t.planMin||15)+'"></div></div>';
  h+='<div class="field"><label>所属营地</label><div class="chipsel" id="tSubj">';
  for(const k of SUBJ_ORDER) h+='<button data-v="'+k+'" class="'+(t.subject===k?"on":"")+'">'+SUBJECTS[k].icon+' '+SUBJECTS[k].place+'</button>';
  h+='</div></div>';
  h+='<div class="field"><label>安排方式</label><div class="chipsel" id="tType">';
  for(const [k,l] of [["daily","每日必做"],["flex","灵活安排"],["fixed","固定日期"]])
    h+='<button data-v="'+k+'" class="'+(t.type===k?"on":"")+'">'+l+'</button>';
  h+='</div></div>';
  h+='<div class="field" id="wrapTarget"'+(t.type==="flex"?"":" hidden")+'><label for="tTarget">每周目标次数</label><input type="number" id="tTarget" min="1" max="7" value="'+weekTargetOf(t)+'"></div>';
  h+='<div class="field" id="wrapDays"'+(t.type==="fixed"?"":" hidden")+'><label>安排在星期</label><div class="chipsel" id="tDays">';
  for(const dw of WD_VIEW) h+='<button data-v="'+dw+'" class="'+((t.weekdays||[]).includes(dw)?"on":"")+'">'+WDX[dw]+'</button>';
  h+='</div></div>';
  h+='<div class="field"><label>时间段</label><div class="chipsel" id="tSlot">';
  for(const [k,l] of TIME_SLOTS) h+='<button data-v="'+k+'" class="'+((t.timeSlot||"any")===k?"on":"")+'">'+l+'</button>';
  h+='</div></div>';
  h+='<div class="field"><label>是否当作硬仗？</label><div class="chipsel" id="tBoss">'
   + '<button data-v="1" class="'+(t.boss?"on":"")+'">⚔ 是，当硬骨头啃</button>'
   + '<button data-v="0" class="'+(!t.boss?"on":"")+'">普通军令</button></div></div>';
  h+='<div class="grid2">';
  if(!isNew) h+='<button class="btn danger" onclick="delTask(\''+id+'\')">删除</button>';
  h+='<button class="btn" id="tOk">'+(isNew?"创建":"保存")+'</button></div>';
  if(!isNew) h+='<button class="btn ghost block sm" onclick="pauseTask(\''+id+'\')">先暂停这项（不删记录）</button>';
  openSheet(h,(sheet)=>{
    bindChips(sheet,"#tSubj"); bindChips(sheet,"#tType"); bindChips(sheet,"#tDays",true);
    bindChips(sheet,"#tSlot"); bindChips(sheet,"#tBoss");
    $$("#tType button",sheet).forEach(b=>b.addEventListener("click",()=>{
      const v=chipVal(sheet,"#tType");
      $("#wrapTarget",sheet).hidden = v!=="flex";
      $("#wrapDays",sheet).hidden = v!=="fixed";
    }));
    $("#tOk",sheet).onclick=()=>{
      const name=$("#tName",sheet).value.trim();
      if(!name){ toast("先起个名吧"); return; }
      const obj={
        name, emoji:$("#tEmoji",sheet).value.trim(),
        planMin:Math.max(1,parseInt($("#tMin",sheet).value,10)||15),
        subject:chipVal(sheet,"#tSubj")||"other",
        type:chipVal(sheet,"#tType")||"flex",
        timeSlot:chipVal(sheet,"#tSlot")||"any",
        weekTarget:Math.min(7,Math.max(1,parseInt($("#tTarget",sheet).value,10)||3)),
        weekdays:$$("#tDays button.on",sheet).map(b=>+b.dataset.v),
        boss:chipVal(sheet,"#tBoss")==="1",
        archived:false
      };
      if(obj.type==="fixed" && !obj.weekdays.length){ toast("固定日期至少要选一天"); return; }
      // 改任务之前，先把历史账目冻住，避免追溯改写已发的奖励
      settleLedger();
      if(isNew) ST.tasks.push(Object.assign({id:uid()},obj));
      else Object.assign(t,obj);
      closeSheet(); commit(); toast(isNew?"军令已下 ✓":"已保存 ✓");
    };
  });
}
function delTask(id){
  const t=ST.tasks.find(x=>x.id===id); if(!t) return;
  if(!confirm("删除「"+t.name+"」？会同时清掉它的点卯记录（已结算的历史军功不受影响）。\n只是想停一阵的话，用「先暂停这项」。")) return;
  settleLedger();   // 先冻结历史，已发的奖励不会被带走
  ST.tasks=ST.tasks.filter(x=>x.id!==id);
  // 只清还没冻结的日子 —— 冻结日的记录是账本的原始凭证，留着
  for(const d in ST.records){
    if(isFrozen(d)) continue;
    delete ST.records[d][id];
    if(!Object.keys(ST.records[d]).length) delete ST.records[d];
  }
  delete ST.graduated[id];
  closeSheet(); commit(); toast("已删除");
}
function pauseTask(id){
  const t=ST.tasks.find(x=>x.id===id); if(!t) return;
  settleLedger();
  t.archived=true;
  closeSheet(); commit(); toast("「"+t.name+"」已暂停，可以随时恢复");
}
function resumeTask(id){
  const t=ST.tasks.find(x=>x.id===id); if(!t) return;
  settleLedger();
  t.archived=false;
  commit(); toast("「"+t.name+"」已恢复");
}

/* ---- 锦囊 ---- */
function openPrizeEdit(id){
  const p = id ? ST.prizes.find(x=>x.id===id) : { name:"", emoji:"🎁", tier:"common", merit:50, weight:10 };
  if(!p) return;
  const isNew=!id;
  let h='<h3>'+(isNew?"新增锦囊":"编辑锦囊")+'</h3><div class="sh-sub">最好和孩子一起商量着填进去</div>';
  h+='<div class="field"><label for="pName">奖励名</label><input type="text" id="pName" value="'+esc(p.name)+'" placeholder="例：心仪的书一本" maxlength="20"></div>';
  h+='<div class="grid2"><div class="field"><label for="pEmoji">图标 emoji</label><input type="text" id="pEmoji" value="'+esc(p.emoji||"")+'"></div>'
   + '<div class="field"><label for="pCost">开启需军功</label><input type="number" id="pCost" min="1" value="'+(p.merit||50)+'"></div></div>';
  h+='<div class="field"><label>档位</label><div class="chipsel" id="pTier">';
  for(const k of TIER_ORDER) h+='<button data-v="'+k+'" class="'+(p.tier===k?"on":"")+'">'+TIERS[k].name+'</button>';
  h+='</div></div>';
  h+='<div class="field"><label for="pWeight">抽中权重（越大越容易抽到，0 = 暂不出现）</label><input type="number" id="pWeight" min="0" max="999" value="'+(p.weight==null?10:p.weight)+'"></div>';
  h+='<div class="grid2">';
  if(!isNew) h+='<button class="btn danger" onclick="delPrize(\''+id+'\')">删除</button>';
  h+='<button class="btn" id="pOk">'+(isNew?"创建":"保存")+'</button></div>';
  openSheet(h,(sheet)=>{
    bindChips(sheet,"#pTier");
    $("#pOk",sheet).onclick=()=>{
      const name=$("#pName",sheet).value.trim();
      if(!name){ toast("先起个名吧"); return; }
      const w=parseInt($("#pWeight",sheet).value,10);
      const obj={ name, emoji:$("#pEmoji",sheet).value.trim()||"🎁",
        tier:chipVal(sheet,"#pTier")||"common",
        merit:Math.max(1,parseInt($("#pCost",sheet).value,10)||50),
        weight:isFinite(w)?Math.max(0,w):10 };
      if(isNew) ST.prizes.push(Object.assign({id:uid()},obj));
      else Object.assign(p,obj);
      closeSheet(); commit(); toast(isNew?"锦囊已入榜 🎁":"已保存 ✓");
    };
  });
}
function delPrize(id){
  const p=ST.prizes.find(x=>x.id===id); if(!p) return;
  if(ST.prizes.length<=1){ toast("至少留一个锦囊"); return; }
  if(!confirm("删除「"+p.name+"」？（已经抽到匣里的不受影响）")) return;
  ST.prizes=ST.prizes.filter(x=>x.id!==id);
  closeSheet(); commit(); toast("已删除");
}

/* ---- 休整期 ----
   已经冻结入账的日子不能被休整期追溯改写：新建和修改都只作用于补录窗口及以后。 */
function openBreakEdit(id){
  const b = id ? ST.breaks.find(x=>x.id===id) : { from:TODAY(), to:addD(TODAY(),6), reason:"生病" };
  if(!b) return;
  const isNew=!id, floor=backfillFloor();
  let h='<h3>'+(isNew?"新增休整期":"编辑休整期")+'</h3><div class="sh-sub">休整期间不派军令，连战天数冻结，不会断。<br>最早只能从 '+fmtMD(floor)+' 算起（更早的账已结算）。</div>';
  h+='<div class="grid2"><div class="field"><label for="bFrom">从</label><input type="date" id="bFrom" min="'+floor+'" value="'+esc(b.from)+'"></div>'
   + '<div class="field"><label for="bTo">到</label><input type="date" id="bTo" min="'+floor+'" value="'+esc(b.to)+'"></div></div>';
  h+='<div class="field"><label>原因</label><div class="chipsel" id="bReason">';
  for(const r of BREAK_REASONS) h+='<button data-v="'+r+'" class="'+(b.reason===r?"on":"")+'">'+r+'</button>';
  h+='</div></div>';
  h+='<div class="field"><label>常用长度（从今天起）</label><div class="chipsel" id="bLen">';
  for(const [n,l] of [[3,"3 天"],[7,"1 周"],[14,"2 周"],[30,"1 个月"],[60,"暑假 2 个月"]])
    h+='<button data-v="'+n+'">'+l+'</button>';
  h+='</div></div>';
  h+='<div class="grid2">';
  if(!isNew) h+='<button class="btn danger" onclick="delBreak(\''+id+'\')">删除</button>';
  else h+='<button class="btn ghost" onclick="closeSheet()">取消</button>';
  h+='<button class="btn" id="bOk">'+(isNew?"开始休整":"保存")+'</button></div>';
  openSheet(h,(sheet)=>{
    bindChips(sheet,"#bReason"); bindChips(sheet,"#bLen");
    $$("#bLen button",sheet).forEach(x=>x.addEventListener("click",()=>{
      $("#bFrom",sheet).value=TODAY();
      $("#bTo",sheet).value=addD(TODAY(),parseInt(x.dataset.v,10)-1);
    }));
    $("#bOk",sheet).onclick=()=>{
      let from=$("#bFrom",sheet).value.trim();
      const to=$("#bTo",sheet).value.trim();
      if(!isDateStr(from)||!isDateStr(to)){ toast("日期格式要对，例 2026-10-12"); return; }
      if(to < from){ toast("结束日不能早于开始日"); return; }
      if(to < floor){ toast("这段日子的账已经结算了，不能再改成休整"); return; }
      if(from < floor) from = (!isNew && b.from < floor) ? b.from : floor;
      const reason=chipVal(sheet,"#bReason")||"其他";
      settleLedger();
      if(isNew) ST.breaks.push({ id:uid(), from, to, reason });
      else Object.assign(b, { from, to, reason });
      closeSheet(); commit();
      toast(isNew ? ("已进入休整 · 到 "+fmtMD(to)) : "已保存");
    };
  });
}
function delBreak(id){
  const b=ST.breaks.find(x=>x.id===id); if(!b) return;
  if(!confirm("删除这段休整期（"+b.from+" ~ "+b.to+"）？已经结算入账的日子不受影响。")) return;
  settleLedger();
  ST.breaks=ST.breaks.filter(x=>x.id!==id);
  closeSheet(); commit(); toast("已删除");
}

/* ---- 数据管理 ---- */
function exportData(){
  const blob=new Blob([JSON.stringify(ST,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="少年主公备份_"+TODAY()+".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  toast("已导出备份 📤");
}
function importData(input){
  const f=input.files[0]; if(!f) return;
  const fr=new FileReader();
  fr.onload=()=>{
    try{
      const o=JSON.parse(fr.result);
      if(!isObj(o) || !Array.isArray(o.tasks)) throw new Error("这不是少年主公的备份文件");
      if(!confirm("导入会覆盖当前全部数据，确定吗？")) return;
      ST=hydrate(o);
      settleLedger(); calcAchievements();
      VIEW_DATE=TODAY();
      commit(); toast("导入成功 ✓");
    }catch(e){ alert("导入失败：" + e.message); }
    finally{ input.value=""; }
  };
  fr.readAsText(f);
}
function seedDemo(){
  if(!confirm("将清空现有点卯记录，并给过去 20 天随机生成点卯记录，用于查看效果。确定吗？")) return;
  const today=TODAY();
  ST.ledger={}; ST.records={}; ST.bossDefeats={};
  if(ST.createdAt>addD(today,-20)) ST.createdAt=addD(today,-20);
  const types=["full","full","full","full","half","poor"];
  for(let i=20;i>=1;i--){
    const d=addD(today,-i);
    for(const t of tasksForDate(d)){
      if(Math.random()<0.12) continue;
      const mins=Math.max(5,Math.round((t.planMin||15)*(0.6+Math.random()*0.9)));
      setRec(d,t.id,pickOne(types),mins);
    }
    if(dayIsComplete(d) && Math.random()<0.6) ST.bossDefeats[d]=true;
  }
  // 顺便送几位名将，让图鉴不是空的
  for(const n of ["关羽","张飞","赵云","太史慈","廖化","周仓","关平","乐进","丁奉","马良"])
    if(!ST.heroes[n]) ST.heroes[n]=addD(today,-Math.floor(Math.random()*20));
  settleLedger();
  ST.pity.sinceLegend=0; ST.draws=0;
  calcAchievements(); commit();
  toast("示例数据已生成 🧪");
}
function grantTickets(n){
  ST.bonusTickets+=(n||1);
  commit();
  toast("已补 "+(n||1)+" 枚招贤令 🎟️");
}
function resetAll(){
  if(!confirm("清空全部数据并恢复出厂设置？此操作不可撤销！")) return;
  if(!confirm("再确认一次：所有点卯记录、武将图鉴、锦囊、军报都会被删除。")) return;
  try{ localStorage.removeItem(KEY); }catch(e){}
  ST=defaultState(); VIEW_DATE=TODAY();
  commit(); toast("已恢复出厂设置");
}
