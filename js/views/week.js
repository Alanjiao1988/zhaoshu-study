"use strict";
/* =====================================================================
   视图：一周军令
   ===================================================================== */

function weekNavHTML(label){
  return '<div class="weeknav">'
    + '<button class="btn ghost sm" onclick="shiftWeek(-1)">← 上一周</button>'
    + '<span class="wk">'+label+'</span>'
    + '<button class="btn ghost sm" onclick="shiftWeek(1)">下一周 →</button>'
    + '</div>';
}
function viewWeek(){
  const s=weekSummary(VIEW_DATE);
  const days=s.days;
  const isThis=days[0]===weekStart(TODAY());
  let h='<div class="card">';
  h+='<div class="card-head"><h3>一周军令</h3><span class="hint">'+fmtMD(days[0])+' — '+fmtMD(days[6])+'</span></div>';
  h+=weekNavHTML(isThis?"本周":fmtMD(days[0])+" 那周");
  h+='<div class="scroll-x"><div class="wgrid">';
  for(const d of days){
    const list=tasksForDate(d);
    h+='<div class="wcol'+(d===TODAY()?" today":"")+'">'
     + '<div class="wh">'+WDX[dow(d)]+'<small>'+parseD(d).getDate()+'</small></div>';
    if(!list.length){
      h+='<div class="wrest">🍵 '+(isRestDay(d)?esc(restReason(d)):"休整")+'</div>';
    }else{
      for(const t of list){
        const r=rec(d,t.id);
        const lc = !r?"·":(r.type==="full"?"⭐":(r.type==="skip"?"🏳️":(isDone(r)?"◑":"✕")));
        h+='<button class="wchip'+(isDone(r)?" done":"")+'" style="border-left-color:'+subjectOf(t.subject).color+'" onclick="openCheck(\''+t.id+'\',\''+d+'\')" title="'+esc(t.name)+'">'
         + esc(t.name.slice(0,4))+'<span class="lc"> '+lc+'</span></button>';
      }
      for(const t of holidayTasks(d)) h+='<div class="wchip done ghost">'+esc(t.name.slice(0,4))+'<span class="lc"> ✓</span></div>';
    }
    h+='</div>';
  }
  h+='</div></div>';
  h+='<div class="divider"></div>'
   + '<div class="row-between strong"><span>本周军令达成</span><span>'+s.pct+'%</span></div>'
   + '<div class="prog"><i style="width:'+s.pct+'%"></i></div>'
   + (s.restDays?'<div class="muted small">本周有 '+s.restDays+' 天在休整，不算进达成率</div>':'')
   + '<button class="btn jade block" onclick="goReport()">去看这周军报 →</button>';
  h+='</div>';
  return h;
}
VIEWS.week = viewWeek;

function shiftWeek(n){ VIEW_DATE=addD(weekStart(VIEW_DATE),n*7); render(); }
function goReport(){ switchView("report"); }
