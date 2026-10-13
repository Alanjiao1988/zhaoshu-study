"use strict";
/* =====================================================================
   视图：武将 —— 招贤榜、锦囊匣、兑现台、武将图鉴、锦囊概率
   ===================================================================== */

function pityHTML(){
  const left=pityLeft(), done=PITY-left;
  return '<div class="pity">'
    + '<div class="pt"><span class="pl">'+(left<=0?"🎉 下一榜必出神将":"再揭 "+left+" 次必出神将")+'</span>'
    + '<span class="muted">'+done+' / '+PITY+'</span></div>'
    + '<div class="prog mini"><i style="width:'+pct(done,PITY)+'%"></i></div></div>';
}
const VAULT_FROM = { boss:"破敌所得", draw:"招贤所得" };

function viewHeroes(){
  const owned=heroOwnedCount(), tot=heroTotal();
  const av=availMerit(), tk=ticketsAvail();

  // ===== 招贤榜 =====
  let h='<div class="card">';
  h+='<div class="card-head"><h3>招贤榜</h3><span class="hint">名将 '+owned+' / '+tot+'</span></div>';
  h+='<div class="prog"><i style="width:'+pct(owned,tot)+'%"></i></div>';
  h+='<div class="row-between"><span>图鉴收集度 '+pct(owned,tot)+'%</span><span>招贤令 🎟️ '+tk+'</span></div>';
  h+='<button class="btn gold block" '+(tk<1?"disabled":"")+' onclick="openDraw()">'
   + (tk<1?"尚无招贤令":"✨ 揭榜招贤（🎟️ × 1）")+'</button>';
  h+=pityHTML();
  h+='<div class="quote">揭榜有名将卡与锦囊两种。名将卡直接入图鉴永久收藏；锦囊是实打实的奖励，需攒够军功才能开启。重复抽到的名将会折算成军功，不亏。</div>';
  h+='</div>';

  // ===== 锦囊匣 =====
  h+='<div class="card"><div class="card-head"><h3>锦囊匣</h3><span class="hint">可用军功 ⭐'+av+'</span></div>';
  const un=ST.vault.filter(v=>!v.redeemed);
  const re=ST.vault.filter(v=>v.redeemed);
  if(!un.length){
    h+='<div class="empty"><span class="ee">🎁</span>匣中空空<br>揭榜或破敌可得锦囊</div>';
  }else{
    for(const v of un){
      const T=TIERS[v.tier]||TIERS.common;
      const lack=round1(v.merit-av);
      h+='<div class="opt static">'
       + '<span class="oe">'+esc(v.emoji)+'</span>'
       + '<span class="ob"><span class="ot">'+esc(v.name)+'</span>'
       + '<span class="od">'+T.name+' · '+(VAULT_FROM[v.from]||"所得")+' · '+v.gotAt+'</span></span>'
       + '<span class="vcol"><span class="os">⭐'+v.merit+'</span>'
       + '<button class="btn '+(lack<=0?"gold":"ghost")+' sm" '+(lack<=0?"":"disabled")+' onclick="redeem(\''+v.uid+'\')">'+(lack<=0?"开启":"还差 "+lack)+'</button>'
       + '</span>'
       + '<button class="wishbtn'+(v.wish?" on":"")+'" title="最想要这个" aria-pressed="'+(!!v.wish)+'" onclick="markWish(\''+v.uid+'\')">'+(v.wish?"❤️":"🤍")+'</button>'
       + '</div>';
    }
    if(Object.keys(swappableGroups()).length){
      h+='<button class="btn ghost block" onclick="openSwap()">🔁 同等军功的锦囊可互换</button>';
    }
  }
  if(re.length){
    h+='<div class="divider"></div><div class="subhead">已开启 '+re.length+' 件</div>';
    for(const v of re) h+='<div class="prize-row faded"><span class="pe">'+esc(v.emoji)+'</span><span class="pn">'+esc(v.name)+'</span><span class="pc">已开启</span></div>';
  }
  h+='</div>';

  // ===== 兑现台：开了锦囊不等于拿到手 =====
  const pend=couponsPending(), doneC=couponsDone(), rate=couponRate();
  h+='<div class="card"><div class="card-head"><h3>兑现台</h3>'
   + '<span class="hint">'+(pend.length?pend.length+" 张待兑现":"都兑现了")+'</span></div>';
  if(rate!==null){
    const tone = rate>=90 ? "var(--ok)" : (rate>=60 ? "var(--gold)" : "var(--zhu)");
    h+='<div class="ratebar"><span class="rv" style="color:'+tone+'">'+rate+'%</span>'
     + '<span class="rt">兑现率 · 已兑现 '+doneC.length+' / 共 '+ST.coupons.length+' 张<br>'
     + (rate>=90 ? "说到做到，这套系统的信用很稳"
        : rate>=60 ? "多数兑现了，还有几张在等"
        : "攒了很久的军功换来一句「下次吧」，孩子会算这笔账")+'</span></div>';
  }
  if(!ST.coupons.length){
    h+='<div class="empty"><span class="ee">🎫</span>还没有兑现券<br>'
     + '<small>开启锦囊时会自动发一张，<br>大人点「已兑现」之后才算真的到手。</small></div>';
  }else{
    for(const c of pend){
      h+='<div class="coupon'+(couponDays(c)>=COUPON_LATE_DAYS?" overdue":"")+'">'
       + '<span class="no">'+couponNo(c)+'</span>'
       + '<span class="ce">'+esc(c.emoji)+'</span>'
       + '<span class="cb"><span class="ct">'+esc(c.name)+'</span>'
       + '<span class="cd">'+couponDaysText(c)+'</span></span>'
       + '<button class="btn jade sm" onclick="openCouponSettle(\''+c.id+'\')">已兑现</button>'
       + '</div>';
    }
    for(const c of doneC.slice(-4).reverse()){
      h+='<div class="coupon done">'
       + '<span class="ce">'+esc(c.emoji)+'</span>'
       + '<span class="cb"><span class="ct">'+esc(c.name)+'</span>'
       + '<span class="cd">'+couponDaysText(c)+'</span></span>'
       + '<span class="ok-mark">✓</span>'
       + '</div>';
    }
  }
  h+='</div>';

  // ===== 武将图鉴 =====
  h+='<div class="card"><div class="card-head"><h3>武将图鉴</h3><span class="hint">点击查看</span></div>';
  for(const tier of HERO_ORDER){
    const list=HEROES[tier];
    const n=list.filter(x=>heroOwned(x.n)).length;
    h+='<div class="hero-tier-title">'+HERO_TIER_NAME[tier]+'<span class="cnt">'+n+' / '+list.length+'</span></div>';
    h+='<div class="heroes">';
    list.forEach((x,i)=>{
      const on=heroOwned(x.n);
      h+='<'+(on?'button':'div')+' class="hero-card t-'+tier+(on?"":" locked")+'"'+(on?' onclick="showHero(\''+tier+'\','+i+')"':'')+'>'
       + '<span class="tag-r">'+HERO_TIER_NAME[tier]+'</span>'
       + '<span class="he">'+(on?x.e:"❔")+'</span>'
       + '<span class="hn">'+(on?esc(x.n):"未招募")+'</span>'
       + '<span class="hd">'+(on?esc(x.d):"揭榜以遇")+'</span>'
       + '</'+(on?'button':'div')+'>';
    });
    h+='</div>';
  }
  h+='</div>';

  // ===== 锦囊概率说明 =====
  h+='<div class="card"><div class="card-head"><h3>锦囊内容</h3><span class="hint">抽中锦囊时的概率</span></div>';
  h+=prizeTableHTML(false);
  h+='</div>';
  return h;
}
VIEWS.heroes = viewHeroes;

// 锦囊列表（武将页只读展示；设置页可编辑）
function prizeTableHTML(editable){
  const all=ST.prizes.reduce((a,p)=>a+(p.weight||0),0);
  let h='';
  for(const tier of TIER_ORDER){
    const list=ST.prizes.filter(p=>p.tier===tier);
    if(!list.length) continue;
    const wsum=list.reduce((a,b)=>a+(b.weight||0),0);
    h+='<div class="subhead">'+TIERS[tier].name+(editable?'':'（约 '+pct(wsum,all)+'%）')+'</div>';
    for(const p of list){
      h+='<div class="prize-row"><span class="pe">'+esc(p.emoji||"🎁")+'</span><span class="pn">'+esc(p.name)+'</span>'
       + '<span class="pc">⭐'+p.merit+' · 权重 '+(p.weight||0)+'</span>'
       + (editable?'<button class="btn ghost sm" onclick="openPrizeEdit(\''+p.id+'\')">改</button>':'')
       + '</div>';
    }
  }
  return h;
}

function showHero(tier,i){
  const x=(HEROES[tier]||[])[i]; if(!x || !heroOwned(x.n)) return;
  const dups=ST.heroCount[x.n]||1;
  const cls=tier==="legend"?"t-legend":tier==="rare"?"t-rare":"t-normal";
  openSheet('<h3>'+esc(x.n)+'</h3><div class="sh-sub">'+HERO_TIER_NAME[tier]+' · '+esc(x.d)+'</div>'
    + '<div class="result-box '+cls+'"><div class="re">'+x.e+'</div><div class="rn">'+esc(x.n)+'</div>'
    + '<div class="rt">入麾下于 '+ST.heroes[x.n]+'</div>'
    + (dups>1?'<div class="rc">已相遇 '+dups+' 次</div>':'')
    + '</div><button class="btn ghost block" onclick="closeSheet()">收起</button>');
}

/* =====================================================================
   招贤榜（抽卡）
   ===================================================================== */
function drawResultHTML(res){
  if(res.kind==="hero"){
    const x=res.hero;
    const cls = x.tier==="legend"?"t-legend":x.tier==="rare"?"t-rare":"t-normal";
    return '<div class="result-box '+cls+'"><div class="re">'+x.e+'</div><div class="rn">'+esc(x.n)+'</div>'
      + '<div class="rt">'+HERO_TIER_NAME[x.tier]+' · '+esc(x.d)+'</div><div class="rc">已录入武将图鉴</div></div>'
      + (res.forced?'<div class="quote">🎯 保底触发！连揭 '+PITY+' 榜未遇神将，此番必得。</div>':'');
  }
  if(res.kind==="dup"){
    const x=res.hero;
    return '<div class="result-box '+(x.tier==="legend"?"t-legend":"t-normal")+'"><div class="re">'+x.e+'</div>'
      + '<div class="rn">'+esc(x.n)+'</div><div class="rt">已在麾下，此番再遇</div>'
      + '<div class="rc">折算为 ⭐'+res.merit+' 军功</div></div>'
      + '<div class="quote">'+(res.forced
          ? '🎯 保底触发！虽是旧将重逢，但这 '+res.merit+' 军功是实打实的。'
          : '旧将重逢，也是缘分。军功已入账。')+'</div>';
  }
  const p=res.prize, T=TIERS[p&&p.tier]||TIERS.common;
  return '<div class="result-box '+T.cls+'"><div class="re">'+(p?esc(p.emoji||"🎁"):"🎁")+'</div>'
    + '<div class="rn">'+(p?esc(p.name):"空榜")+'</div>'
    + '<div class="rt">'+(p?T.name:"锦囊库是空的，去设置里添几个吧")+'</div>'
    + (p?'<div class="rc">存入锦囊匣 · 攒够 ⭐'+p.merit+' 军功可开</div>':'')+'</div>';
}
function drawConfetti(res){
  if(res.kind==="hero") return res.hero.tier==="legend"?150:res.hero.tier==="rare"?100:60;
  if(res.kind==="dup") return res.forced?150:40;
  return res.prize && res.prize.tier==="legend"?130:70;
}
function openDraw(){
  if(ticketsAvail()<1){ toast("还没有招贤令——今日军令齐备就能得一枚 🎟️"); return; }
  const owned=heroOwnedCount(), tot=heroTotal();
  let h='<h3>招贤榜</h3><div class="sh-sub">耗 🎟️ × 1 · 榜上名将 '+owned+' / '+tot+' 已入麾下<br>有缘者得名将卡，余者得锦囊</div>';
  h+=pityHTML();
  h+='<div class="draw-stage" id="ds"><div class="draw-roll" id="dr">📜</div></div>'
   + '<button class="btn gold block" id="drawBtn">✨ 揭榜</button>'
   + '<div id="drawResult"></div>';
  openSheet(h,(sheet)=>{
    const btn=$("#drawBtn",sheet);
    btn.onclick=()=>{
      if(btn.disabled) return;
      if(ticketsAvail()<1){ toast("招贤令不够了"); return; }
      btn.disabled=true; btn.textContent="揭榜中…";
      // 先结算再播动画：中途关掉弹窗，结果也已经入账
      ST.draws++;
      const res=rollDraw();
      calcAchievements(); save();
      $("#dr",sheet).classList.add("opened");
      setTimeout(()=>{
        if(!sheet.isConnected){ render(); return; }
        confetti(drawConfetti(res));
        const left=ticketsAvail();
        $("#drawResult",sheet).innerHTML = drawResultHTML(res)
          + '<div class="grid2"><button class="btn ghost" onclick="closeSheet();">收好</button>'
          + (left>0
              ? '<button class="btn" onclick="openDraw();">再揭一次 🎟️'+left+'</button>'
              : '<button class="btn" disabled>招贤令用完了</button>')
          + '</div>';
        btn.style.display="none";
        $("#ds",sheet).style.display="none";
        render();
      },800);
    };
  });
}

/* =====================================================================
   锦囊：开启、心愿、互换
   ===================================================================== */
function redeem(u){
  const res=redeemVault(u);
  if(!res.ok){ if(res.reason==="merit") toast("还差 "+res.lack+" 军功"); return; }
  const c=res.coupon;
  commit(); confetti(90);
  openSheet(
    '<div class="ceremony-hero"><span class="ce">'+esc(c.emoji)+'</span><div class="cn">'+esc(c.name)+'</div></div>'
    + '<div class="sh-sub center">锦囊已开 · 兑现券 '+couponNo(c)+'</div>'
    + '<div class="quote center">这张券还在等兑现。<br>找大人约个时间，兑现之后由大人点「已兑现」。</div>'
    + '<button class="btn block" onclick="closeSheet();">知道了</button>'
  );
}
function markWish(u){
  const v=ST.vault.find(x=>x.uid===u); if(!v) return;
  v.wish=!v.wish;
  if(v.wish){ logSignal("wish", v.name); toast("已标记「最想要这个」——大人看得到 ♡",2600); }
  commit();
}
function openSwap(){
  const groups=swappableGroups();
  const items=Object.values(groups).flat();
  if(!items.length){ toast("没有同门槛的锦囊可以互换"); return; }
  let h='<h3>🔁 互换锦囊</h3><div class="sh-sub">只有相同军功门槛的锦囊之间可以互换</div>';
  h+='<div class="field"><label for="swFrom">要换出去的</label><select id="swFrom">';
  for(const v of items) h+='<option value="'+v.uid+'">'+esc(v.emoji)+' '+esc(v.name)+'（⭐'+v.merit+'）</option>';
  h+='</select></div>';
  h+='<div class="field"><label for="swTo">换成（同门槛）</label><select id="swTo"></select></div>';
  h+='<div class="grid2"><button class="btn ghost" onclick="closeSheet()">取消</button><button class="btn" id="swOk">确认互换</button></div>';
  openSheet(h,(sheet)=>{
    const from=$("#swFrom",sheet), to=$("#swTo",sheet);
    const sync=()=>{
      const v=items.find(x=>x.uid===from.value);
      to.innerHTML=groups[v.merit].filter(x=>x.uid!==v.uid)
        .map(x=>'<option value="'+x.uid+'">'+esc(x.emoji)+' '+esc(x.name)+'</option>').join("");
    };
    from.onchange=sync; sync();
    $("#swOk",sheet).onclick=()=>{
      if(!swapVault(from.value,to.value)){ toast("这两个锦囊不能互换"); return; }
      closeSheet(); commit(); toast("已互换 ✓");
    };
  });
}

/* =====================================================================
   兑现台
   ===================================================================== */
function couponDaysText(c){
  const d=couponDays(c);
  if(c.status==="done") return "已于 "+c.doneAt+" 兑现"+(c.note?(" · "+esc(c.note)):"");
  if(d<=0) return "今天刚开 · 找大人约个时间";
  if(d>=COUPON_LATE_DAYS) return '<span class="late">已经等了 '+d+' 天</span> · 记得提醒大人';
  return "已经等了 "+d+" 天";
}
function openCouponSettle(id){
  const c=ST.coupons.find(x=>x.id===id); if(!c) return;
  const d=couponDays(c);
  let h='<div class="ceremony-hero"><span class="ce">'+esc(c.emoji)+'</span><div class="cn">'+esc(c.name)+'</div></div>'
    + '<div class="sh-sub center">兑现券 '+couponNo(c)+' · 开启于 '+c.openedAt
    + (d>0 ? '（已经等了 '+d+' 天）' : '（今天开的）')+'</div>';
  h+='<div class="quote">孩子攒了很久的军功，换成了这一张券。<br>点下面的按钮，就是大人给这份努力结账。</div>';
  h+='<div class="field"><label for="cpNote">留一句话（可留空）</label>'
   + '<input type="text" id="cpNote" placeholder="例：周日下午去了游乐场" maxlength="30"></div>';
  h+='<div class="grid2"><button class="btn ghost" onclick="closeSheet()">还没兑现</button>'
   + '<button class="btn jade" id="cpOk">家长确认已兑现</button></div>';
  openSheet(h,(sheet)=>{
    $("#cpOk",sheet).onclick=()=>{
      settleCouponState(id, $("#cpNote",sheet).value.trim());
      closeSheet(); commit(); confetti(70);
      toast("兑现完成 ✓ 这份承诺算数了",2600);
    };
  });
}
