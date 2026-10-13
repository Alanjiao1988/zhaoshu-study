"use strict";
/* =====================================================================
   小工具：日期、转义、数字。不碰任何状态。
   ===================================================================== */

// 时钟入口。测试里可以覆盖成固定日期：NOW = () => new Date(2026,9,13)
let NOW = () => new Date();

const $  = (s,r)=> (r||document).querySelector(s);
const $$ = (s,r)=> Array.from((r||document).querySelectorAll(s));
const pad = n => String(n).padStart(2,"0");
const ds  = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const TODAY = () => ds(NOW());
const isDateStr = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s));

function parseD(s){ const a=String(s).split("-").map(Number); return new Date(a[0],a[1]-1,a[2]); }
function addD(s,n){ const d=parseD(s); d.setDate(d.getDate()+n); return ds(d); }
function dow(s){ return parseD(s).getDay(); }
// 两个日期之间相差几天（b - a），按本地日历算，不受夏令时影响
function daysBetween(a,b){ return Math.round((parseD(b)-parseD(a))/86400000); }
function weekStart(s){ const d=parseD(s); const w=d.getDay(); d.setDate(d.getDate()+(w===0?-6:1-w)); return ds(d); }
function weekDates(s){ const m=weekStart(s); return Array.from({length:7},(_,i)=>addD(m,i)); }
// 从 from 到 to（含两端）的每一天
function dateRange(from,to){
  const out=[]; let d=from, guard=0;
  while(d<=to && guard++<5000){ out.push(d); d=addD(d,1); }
  return out;
}
function fmtMD(s){ const d=parseD(s); return (d.getMonth()+1)+"月"+d.getDate()+"日"; }
function uid(){ return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function round1(n){ return Math.round((+n||0)*10)/10; }
function pct(a,b){ return b ? Math.round(a/b*100) : 0; }
function pickOne(arr){ return arr.length ? arr[Math.floor(Math.random()*arr.length)] : null; }
// 按权重抽一个：items 里每项的权重由 w(item) 给出
function pickWeighted(items, w){
  const total=items.reduce((a,x)=>a+Math.max(0,w(x)),0);
  if(total<=0) return pickOne(items);
  let x=Math.random()*total;
  for(const it of items){ x-=Math.max(0,w(it)); if(x<0) return it; }
  return items[items.length-1];
}

function cnNum(n){
  const a=["零","一","二","三","四","五","六","七","八","九"];
  n = Math.floor(n);
  if(n<=0) return "零";
  if(n<10) return a[n];
  if(n<20) return "十"+(n>10?a[n-10]:"");
  if(n<100){ const t=Math.floor(n/10), o=n%10; return a[t]+"十"+(o?a[o]:""); }
  if(n<1000){
    const h=Math.floor(n/100), rest=n%100;
    const s=a[h]+"百";
    if(rest===0) return s;
    if(rest<10) return s+"零"+a[rest];
    if(rest<20) return s+"一十"+(rest>10?a[rest-10]:"");
    const t2=Math.floor(rest/10), o2=rest%10;
    return s+a[t2]+"十"+(o2?a[o2]:"");
  }
  return String(n);
}

function festivalOf(dateStr){
  const d=parseD(dateStr), m=d.getMonth()+1, day=d.getDate();
  const near=(list,before,after)=>list.some(k=>dateStr>=addD(k,-before) && dateStr<=addD(k,after));
  if(near(LUNAR.spring,4,6))    return "spring";
  if(near(LUNAR.dragon,1,2))    return "dragon";
  if(near(LUNAR.midautumn,1,2)) return "midautumn";
  if(m===10 && day<=7) return "national";
  if(m===6  && day===1) return "kids";
  return null;
}
