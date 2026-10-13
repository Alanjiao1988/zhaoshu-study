"use strict";
/* =====================================================================
   视图：点将台 —— 本周达成、军功账、用时对比、官职、徽章、名将收集、已养成
   ===================================================================== */

const SOLDIERS = (()=>{
  const a=[];
  // 后排 10 人（略小、偏上，做出纵深）
  for(let i=0;i<10;i++) a.push({ x:46+i*12.0, y:158, sc:0.85, back:true });
  // 前排 10 人
  for(let i=0;i<10;i++) a.push({ x:40+i*13.3, y:170, sc:1.0,  back:false });
  return a;
})();
function stageSVG(p){
  const n=Math.round(p/100*SOLDIERS.length);
  let sv='<svg class="stage-svg" viewBox="0 0 200 200" role="img" aria-label="点将台：台上 '+n+' 人">';
  sv+='<title>点将台</title><desc>本周军令达成率越高，台上列阵的将士越多，满员二十人。</desc>';
  // 旗杆与旗
  sv+='<line x1="100" y1="170" x2="100" y2="80" class="st-pole" stroke-width="2.6" stroke-linecap="round"/>';
  sv+='<path d="M100 82 L140 94 L100 108 Z" class="st-flag"/>';
  // 台基（三层，越往下越宽）
  sv+='<rect x="52" y="186" width="96" height="8" rx="2" class="st-b3"/>';
  sv+='<rect x="44" y="178" width="112" height="8" rx="2" class="st-b2"/>';
  sv+='<rect x="36" y="170" width="128" height="8" rx="2" class="st-b1"/>';
  sv+='<rect x="42" y="156" width="116" height="3" rx="1.5" class="st-ground"/>';
  for(let i=0;i<n;i++){
    const s=SOLDIERS[i], c=s.back?"st-back":"st-front", sc=s.sc, x=s.x, y=s.y;
    sv+='<circle cx="'+x+'" cy="'+(y-11*sc).toFixed(1)+'" r="'+(3.1*sc).toFixed(2)+'" class="'+c+'"/>';
    sv+='<path d="M'+(x-4*sc).toFixed(1)+' '+y
      +' L'+(x-2.6*sc).toFixed(1)+' '+(y-9*sc).toFixed(1)
      +' L'+(x+2.6*sc).toFixed(1)+' '+(y-9*sc).toFixed(1)
      +' L'+(x+4*sc).toFixed(1)+' '+y+' Z" class="'+c+'"/>';
  }
  return sv+'</svg>';
}

function viewStats(){
  const s=weekSummary(VIEW_DATE);
  const days=s.days;
  const owned=heroOwnedCount(), heroTot=heroTotal();
  const onStage=Math.round(s.pct/100*20);

  let h='<div class="card"><div class="card-head"><h3>点将台</h3><span class="hint">'+fmtMD(days[0])+' — '+fmtMD(days[6])+'</span></div>';
  h+='<div class="stage-wrap">'+stageSVG(s.pct)
   + '<div class="stage-text">'
   + '<div class="strong">本周军令达成 '+s.pct+'%</div>'
   + '<p class="muted">'
   + (s.pct>=100?"台上二十员将士列阵，威势已成 🎉":(s.pct>=60?"人马渐齐，再操练几日":(s.pct>0?"台上才站了 "+onStage+" 人，还需操练":"点将台上空无一人，今日开始吧")))
   + '<br>已完成 '+s.done+' / '+s.tot+' 项军令</p>'
   + '<div class="prog"><i style="width:'+s.pct+'%"></i></div>'
   + '</div></div></div>';

  h+='<div class="card"><div class="card-head"><h3>本周军功账</h3></div><div class="report-stat">';
  h+='<div class="rs-box"><div class="v">'+s.merit+'</div><div class="l">本周所得</div></div>';
  for(const [v,l] of [[s.full,"完胜 ⭐"],[s.half,"苦战 ◑"],[s.poor,"惨胜 ◐"],[s.miss,"未战 ✕"]]){
    h+='<div class="rs-box"><div class="v">'+v+'</div><div class="l">'+l+'</div></div>';
  }
  h+='</div>';
  h+='<p class="muted">累计军功 ⭐'+totalMerit()+'（点卯所得 '+earnedMerit()+(ST.bonusMerit?(" · 旧将重逢 "+round1(ST.bonusMerit)):"")+'）<br>'
   + '可用 ⭐'+availMerit()+' · 已开锦囊用去 ⭐'+spentMerit()+'</p></div>';

  // ===== 计划 vs 实际 =====
  const rows=Object.values(s.perTask).filter(r=>r.act>0);
  h+='<div class="card"><div class="card-head"><h3>计划用时 vs 实际用时</h3><span class="hint">本周</span></div>';
  if(!rows.length){
    h+='<div class="empty"><span class="ee">⏱</span>还没有记录实际用时<br>点卯时填一下就能看到对比</div>';
  }else{
    const max=Math.max(...rows.map(r=>Math.max(r.plan,r.act)),1);
    h+='<div class="barcmp">';
    for(const r of rows){
      h+='<div class="row"><span class="nm" title="'+esc(r.name)+'">'+esc(r.name)+'</span>'
       + '<span class="bars"><span class="b1" style="width:'+Math.max(3,pct(r.plan,max))+'%"></span>'
       + '<span class="b2" style="width:'+Math.max(3,pct(r.act,max))+'%"></span></span>'
       + '<span class="vv">'+r.plan+'′ / '+r.act+'′</span></div>';
    }
    h+='</div>';
    h+='<div class="legend"><span><i class="b1"></i>计划用时</span><span><i class="b2"></i>实际用时</span></div>';
    const tp=rows.reduce((a,b)=>a+b.plan,0), ta=rows.reduce((a,b)=>a+b.act,0);
    h+='<p class="muted">合计：计划 '+tp+' 分钟 · 实际 '+ta+' 分钟'+(ta>tp?'（超时 '+(ta-tp)+' 分钟）':(ta<tp?'（提前 '+(tp-ta)+' 分钟）':''))+'</p>';
  }
  h+='</div>';

  // ===== 官职（只升不降，全按历史最高军功算）=====
  const rm=rankMerit(), rk=rankOf(rm);
  h+='<div class="card"><div class="card-head"><h3>官职</h3><span class="hint">'+esc(ST.season.name)+'</span></div>';
  h+='<div class="rank-now">'+rk.cur.e+' '+rk.cur.n+'</div>';
  if(rk.next){
    h+='<p class="muted">距「'+rk.next.e+' '+rk.next.n+'」尚差 '+round1(rk.next.s-rm)+' 军功</p>';
    h+='<div class="prog"><i style="width:'+pct(rm-rk.cur.s, rk.next.s-rk.cur.s)+'%"></i></div>';
  }else{
    h+='<p class="muted">已是汉中王，三分天下有其一 👑</p>';
  }
  h+='<div class="ranktrack">';
  for(const r of RANKS) h+='<div class="rank'+(rm>=r.s?" on":"")+'"><div class="re">'+r.e+'</div><div class="rn">'+r.n+'</div><div class="rs">'+r.s+'⭐</div></div>';
  h+='</div></div>';

  // ===== 典故徽章 =====
  h+='<div class="card"><div class="card-head"><h3>典故徽章</h3><span class="hint">'+BADGE_DEF.filter(b=>ST.achievements[b.id]).length+' / '+BADGE_DEF.length+'</span></div><div class="badges">';
  for(const b of BADGE_DEF){
    const on=!!ST.achievements[b.id];
    h+='<div class="badge'+(on?" on":"")+'"><div class="bi">'+b.e+'</div><div class="bn">'+b.n+'</div><div class="bd">'+(on?(ST.achievements[b.id]+" 得"):b.d)+'</div></div>';
  }
  h+='</div></div>';

  // ===== 名将收集 =====
  h+='<div class="card"><div class="card-head"><h3>名将收集</h3><span class="hint">'+owned+' / '+heroTot+'</span></div>';
  for(const tier of HERO_ORDER){
    const list=HEROES[tier];
    const n=list.filter(x=>heroOwned(x.n)).length, p=pct(n,list.length);
    h+='<div class="collect"><div class="row-between strong"><span>'+HERO_TIER_NAME[tier]+'</span>'
     + '<span class="'+(p>=100?"ok":"muted")+'">'+n+'/'+list.length+(p>=100?" ✓":"")+'</span></div>'
     + '<div class="prog mini"><i style="width:'+p+'%"></i></div></div>';
  }
  h+='</div>';

  // ===== 荣誉墙：已经养成、自动毕业的军令 =====
  const gradIds=Object.keys(ST.graduated);
  h+='<div class="card"><div class="card-head"><h3>已养成</h3><span class="hint">连续 '+GRADUATE_WEEKS+' 周满勤自动毕业</span></div>';
  if(!gradIds.length){
    h+='<div class="empty"><span class="ee">🌱</span>还没有军令毕业<br>'
     + '<small>任何一项军令连续 '+GRADUATE_WEEKS+' 个完整周 100% 达成，就会自动毕业、移出每日清单。<br>推着走的终点，是你自己走。</small></div>';
  }else{
    h+='<div class="honor">';
    for(const id of gradIds){
      const g=ST.graduated[id];
      h+='<div class="honor-card"><span class="hc-badge">🎓</span>'
       + '<div class="he">'+(g.emoji||subjectOf(g.subject).icon)+'</div>'
       + '<div class="hn">'+esc(g.name)+'</div>'
       + '<div class="hd">'+g.at+' 养成</div>'
       + '<div class="hb"><button class="btn ghost sm" onclick="ungraduateConfirm(\''+id+'\')">恢复</button></div>'
       + '</div>';
    }
    h+='</div><p class="muted center">这 '+gradIds.length+' 项已经成为习惯了，不再需要每天推。</p>';
  }
  h+='</div>';
  return h;
}
VIEWS.stats = viewStats;

function ungraduateConfirm(taskId){
  const g=ST.graduated[taskId]; if(!g) return;
  if(!confirm("把「"+g.name+"」放回每日军令清单？")) return;
  settleLedger();
  ungraduate(taskId);
  commit(); toast("已放回每日清单");
}
