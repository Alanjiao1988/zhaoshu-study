"use strict";
/* =====================================================================
   视图：军报 —— 本周统计、主动性、调整建议、各项达成、复盘记录
   ===================================================================== */

function viewReport(){
  const s=weekSummary(VIEW_DATE);
  const days=s.days, base=days[0];
  const isThis=base===weekStart(TODAY());

  let h='<div class="card">';
  h+='<div class="card-head"><h3>本周军报</h3><span class="hint">'+(isThis?"本周":fmtMD(base)+" 那周")+'</span></div>';
  h+=weekNavHTML(fmtMD(days[0])+' — '+fmtMD(days[6]));
  if(s.restDays) h+='<div class="holiday-row">🍵 本周有 '+s.restDays+' 天在休整，已从统计里剔除</div>';
  h+='<div class="report-stat">'
   + '<div class="rs-box"><div class="v">'+s.pct+'%</div><div class="l">军令达成</div></div>'
   + '<div class="rs-box"><div class="v">'+s.merit+'</div><div class="l">所得军功</div></div>'
   + '<div class="rs-box"><div class="v">'+s.full+'</div><div class="l">完胜</div></div>'
   + '<div class="rs-box"><div class="v">'+(s.half+s.poor)+'</div><div class="l">苦战/惨胜</div></div>'
   + '<div class="rs-box"><div class="v">'+s.minutes+'</div><div class="l">用功分钟</div></div>'
   + '<div class="rs-box"><div class="v">'+s.done+'/'+s.tot+'</div><div class="l">完成/总项</div></div>'
   + '</div>';

  // ===== 主动性：这套系统真正该看的数字 =====
  const sig=signalsBetween(days[0], days[6]);
  h+='<div class="divider"></div>';
  h+='<div class="initiative"><span class="big">'+sig.length+'</span><span class="strong">本周孩子主动做的事</span></div>';
  if(!sig.length){
    h+='<p class="muted">这一周还没有。完成率可以靠推，主动推不出来 ——<br>所以这个数字比上面那个百分比更值得留意。</p>';
  }else{
    h+='<div class="actlist">';
    for(const x of sig.slice(-12).reverse()){
      h+='<div class="actrow"><span class="ae">'+(SIGNAL_ICON[x.kind]||"✋")+'</span>'
       + '<span class="an">'+esc(SIGNAL_NAME[x.kind]||"主动")+(x.detail?('：'+esc(x.detail)):'')+'</span>'
       + '<span class="ad">'+x.date.slice(5)+'</span></div>';
    }
    h+='</div>';
  }

  // ===== 调整建议：只有「推」没有「退」，孩子会一直在失败里泡着 =====
  if(isThis){
    const hints=difficultyHints();
    if(hints.length){
      h+='<div class="divider"></div><div class="subhead">⚖️ 调整建议</div>';
      for(const x of hints){
        h+='<div class="hintcard '+x.tone+'">'
         + '<span class="hi">'+(x.tone==="warn"?"⚠️":"⏱")+'</span>'
         + '<span class="hb"><span class="ht">'+esc(x.title)+'</span>'
         + '<span class="hd">'+esc(x.body)+'</span>'
         + '<span class="ha"><button class="btn ghost sm" onclick="applyHint(\''+x.taskId+'\',\''+x.kind+'\')">'+esc(x.action)+'</button></span>'
         + '</span></div>';
      }
      h+='<p class="muted small">任务做不完，多数时候是任务的问题，不是孩子的问题。</p>';
    }
  }

  // ===== 各项军令达成情况 =====
  const rows=[];
  for(const t of ST.tasks){
    if(t.archived) continue;
    let target=0, dn=0;
    if(t.type==="flex"){ target=weekTargetOf(t); dn=Math.min(weekDone(t.id,base),target); }
    else for(const d of days){
      if(d>TODAY() || isRestDay(d) || !appearsOn(t,d)) continue;
      target++; if(doneOn(d,t.id)) dn++;
    }
    if(target) rows.push({ name:t.name, emoji:t.emoji||subjectOf(t.subject).icon, target, dn, color:subjectOf(t.subject).color });
  }
  if(rows.length){
    h+='<div class="divider"></div><div class="subhead">各项军令达成情况</div>';
    for(const r of rows){
      const p=pct(r.dn,r.target), ok=p>=100;
      h+='<div class="collect"><div class="row-between"><span>'+esc(r.emoji)+' '+esc(r.name)+'</span>'
       + '<span class="'+(ok?"ok":"muted")+'">'+r.dn+'/'+r.target+(ok?" ✓":"")+'</span></div>'
       + '<div class="prog mini"><i style="width:'+p+'%;background:'+r.color+'"></i></div></div>';
    }
  }

  // ===== 复盘 =====
  const rep=ST.reports[base]||{ good:"", improve:"", plan:"" };
  h+='<div class="divider"></div>';
  h+='<div class="quote">复盘之要，在少说教、多听孩子说。改进目标写一句他听得懂、够得着的短句就够了。</div>';
  h+='<div class="field"><label for="rGood">🏅 这周做得好的地方</label><textarea id="rGood" placeholder="例：英语阅读提前两天完成，自己发现的">'+esc(rep.good)+'</textarea></div>';
  h+='<div class="field"><label for="rImprove">🔧 需要改进之处</label><textarea id="rImprove" placeholder="例：磨耳朵容易拖延">'+esc(rep.improve)+'</textarea></div>';
  h+='<div class="field"><label for="rPlan">🎯 下周方略</label><textarea id="rPlan" placeholder="例：磨耳朵的功夫用在平时">'+esc(rep.plan)+'</textarea></div>';
  h+='<button class="btn jade block" onclick="saveReport(\''+base+'\')">存下这份军报</button>';
  h+='</div>';

  const keys=Object.keys(ST.reports).sort().reverse();
  if(keys.length){
    h+='<div class="card"><div class="card-head"><h3>往期军报</h3><span class="hint">'+keys.length+' 份</span></div>';
    for(const k of keys.slice(0,26)){
      const r=ST.reports[k];
      h+='<div class="hist-item"><div class="hh"><span>'+fmtMD(k)+' 那周</span><span class="muted">'+(r.pct!=null?r.pct+"%":"")+'</span></div>';
      if(r.good) h+='<div class="hl">🏅 '+esc(r.good)+'</div>';
      if(r.improve) h+='<div class="hl">🔧 '+esc(r.improve)+'</div>';
      if(r.plan) h+='<div class="hl">🎯 '+esc(r.plan)+'</div>';
      h+='</div>';
    }
    h+='</div>';
  }
  return h;
}
VIEWS.report = viewReport;

function saveReport(base){
  ST.reports[base]={
    good:$("#rGood").value.trim(), improve:$("#rImprove").value.trim(), plan:$("#rPlan").value.trim(),
    savedAt:TODAY(), pct:weekSummary(base).pct
  };
  calcAchievements(); commit(); toast("军报已存 ✓");
}
function applyHint(taskId, kind){
  const t=applyHintState(taskId, kind); if(!t) return;
  commit();
  toast("已调整：「"+t.name+"」按新节奏走，两周后如果还不合适再谈");
}
