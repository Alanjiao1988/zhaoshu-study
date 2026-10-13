"use strict";
/* =====================================================================
   界面骨架：提示、彩带、底部弹窗、顶栏、视图切换
   视图函数都返回 HTML 字符串；事件用内联 onclick 调全局函数。
   ===================================================================== */

let VIEW="today";
let VIEW_DATE=TODAY();
const VIEWS = {};            // 各视图文件把自己注册进来：VIEWS.today = viewToday

function toast(msg,ms){
  const old=$(".toast"); if(old) old.remove();
  const t=document.createElement("div");
  t.className="toast"; t.textContent=msg;
  t.setAttribute("role","status");
  document.body.appendChild(t);
  setTimeout(()=>{ t.classList.add("out"); setTimeout(()=>t.remove(),320); }, ms||2000);
}

function confetti(n){
  if(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors=["#B93A32","#D4A03C","#C9A227","#4A9E80","#8A5A3C","#E0C070"];
  for(let i=0;i<(n||70);i++){
    const el=document.createElement("div");
    el.className="confetti";
    el.style.left=(Math.random()*100)+"vw";
    el.style.background=colors[i%colors.length];
    el.style.animationDelay=(Math.random()*0.7)+"s";
    el.style.width=(6+Math.random()*6)+"px";
    el.style.height=(9+Math.random()*8)+"px";
    if(Math.random()>.65) el.style.borderRadius="50%";
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),3600);
  }
}

/* ---- 点卯飘字：让反馈有实体感 ---- */
function floatUp(text, x, y, gold){
  const el=document.createElement("div");
  el.className="float-up"+(gold?" gold":"");
  el.textContent=text;
  el.style.left=(x==null?window.innerWidth/2:x)+"px";
  el.style.top=(y==null?window.innerHeight*0.4:y)+"px";
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1250);
}
function floatFromEl(el,text,gold){
  if(!el) return floatUp(text,null,null,gold);
  const r=el.getBoundingClientRect();
  floatUp(text, r.left+r.width/2, r.top+Math.min(40,r.height/2), gold);
}

/* ---- 底部弹窗 ---- */
function openSheet(html, after){
  closeSheet();
  const mask=document.createElement("div");
  mask.className="mask";
  mask.innerHTML='<div class="sheet" role="dialog" aria-modal="true">'+html+'</div>';
  mask.addEventListener("click",e=>{ if(e.target===mask) closeSheet(); });
  document.body.appendChild(mask);
  document.body.style.overflow="hidden";
  const sheet=$(".sheet",mask);
  if(after) after(sheet);
  return sheet;
}
function closeSheet(){
  const m=$(".mask"); if(m) m.remove();
  document.body.style.overflow="";
}
// 单选 chip 组：点哪个哪个亮
function bindChips(sheet, sel, multi){
  $$(sel+" button",sheet).forEach(b=>b.addEventListener("click",()=>{
    if(multi) b.classList.toggle("on");
    else { $$(sel+" button",sheet).forEach(x=>x.classList.remove("on")); b.classList.add("on"); }
  }));
}
const chipVal = (sheet, sel) => { const b=$(sel+" button.on",sheet); return b ? b.dataset.v : null; };

function onSaveFailed(){
  const w=$("#storageWarn");
  if(w) w.classList.add("show");
  toast("数据没能保存下来：这个浏览器禁用了本地存储",3200);
}
function checkStorage(){
  const ok=storageAvailable();
  const w=$("#storageWarn");
  if(w) w.classList.toggle("show", !ok);
  return ok;
}
function applySkin(){
  const f=festivalOf(TODAY());
  if(f) document.documentElement.setAttribute("data-skin",f);
  else document.documentElement.removeAttribute("data-skin");
  return f;
}

/* ---- 顶栏 ---- */
function refreshTop(){
  $("#brandName").textContent = ST.childName && ST.childName!=="主公" ? ST.childName+" 主公" : "少年主公";
  $("#meritCount").textContent = Math.max(0, availMerit());
  const tk=ticketsAvail();
  $("#orderCount").textContent = tk;
  $("#btnDraw").disabled = tk<1;
  const se=ST.season;
  const days=isDateStr(se.endDate) ? Math.max(0,daysBetween(TODAY(),se.endDate)) : -1;
  const rk=myRank(), f=festivalOf(TODAY()), cs=currentStreak();
  $("#seasonLabel").textContent =
    se.name + " · " + rk.cur.e + rk.cur.n + " · 名将 " + heroOwnedCount() + "/" + heroTotal()
    + (cs>=3 ? " · 🔥连战 "+cs+" 天" : "")
    + (days>0 ? " · 还剩 "+days+" 天" : (days===0 ? " · 今日收官" : ""))
    + (f ? " · "+SKIN_NAME[f] : "");
}

function setTab(){
  $$("#tabs button").forEach(b=>{
    const on=b.dataset.view===VIEW;
    b.classList.toggle("active", on);
    if(on) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current");
  });
}
let LAST_RENDERED_VIEW=null;
// 重绘当前视图。只有切换视图时才回到顶部，点卯后留在原处。
function render(){
  const fn=VIEWS[VIEW]||VIEWS.today;
  $("#main").innerHTML=fn();
  setTab();
  refreshTop();
  if(LAST_RENDERED_VIEW!==VIEW) window.scrollTo(0,0);
  LAST_RENDERED_VIEW=VIEW;
}
function switchView(v, date){
  VIEW=v;
  if(date) VIEW_DATE=date;
  render();
}
// 改了状态之后的统一收尾
function commit(){ save(); render(); }
