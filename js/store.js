"use strict";
/* =====================================================================
   状态：默认值、版本升级、读写 localStorage
   全局只有一份 ST，所有模块直接读写它，改完调 save()。
   ===================================================================== */

let ST = null;

function defaultTasks(){
  const T=o=>Object.assign({id:uid(),archived:false,boss:false,emoji:"",planMin:15,weekTarget:5,weekdays:[1,2,3,4,5,6,0]},o);
  return [
    T({ name:"语文早读",  subject:"cn",   type:"daily", emoji:"📜", timeSlot:"morning", planMin:15 }),
    T({ name:"数学口算",  subject:"math", type:"daily", emoji:"🧮", timeSlot:"morning", planMin:10 }),
    T({ name:"练字一页",  subject:"cn",   type:"daily", emoji:"🖌️", timeSlot:"evening", planMin:15 }),
    T({ name:"英语磨耳朵",subject:"en",   type:"flex",  emoji:"🎧", timeSlot:"evening", planMin:20, weekTarget:5, boss:true }),
    T({ name:"英文阅读",  subject:"en",   type:"flex",  emoji:"📖", timeSlot:"any",     planMin:15, weekTarget:3 }),
    T({ name:"单词打卡",  subject:"en",   type:"flex",  emoji:"🔤", timeSlot:"any",     planMin:10, weekTarget:3 }),
    T({ name:"奥数练习",  subject:"math", type:"flex",  emoji:"📐", timeSlot:"evening", planMin:30, weekTarget:2, boss:true })
  ];
}
function defaultPrizes(){
  const P=(tier,name,emoji,merit,weight)=>({id:uid(),tier,name,emoji,merit,weight});
  return [
    P("common","一支新笔","✏️",40,12),
    P("common","小零食一份","🍬",50,12),
    P("common","30 分钟自由支配","⏳",60,12),
    P("common","免一次课外作业","📜",80,10),
    P("rare","心仪的书一本","📚",200,9),
    P("rare","小玩意一件","🎁",300,8),
    P("rare","周末半日自由安排","🎡",400,7),
    P("legend","现金 100 元","💴",1000,3),
    P("legend","外出旅行一次","✈️",1500,2),
    P("legend","心愿一件（自己填）","🌟",1500,2)
  ];
}
function defaultState(){
  const t=TODAY(), mon=weekStart(t);
  return {
    schema:SCHEMA,
    appVersion:APP_VERSION,
    childName:"主公",
    tasks:defaultTasks(),
    // 点卯记录：{ "YYYY-MM-DD": { taskId: {level,type,minutes,at} } }
    records:{},
    bossDefeats:{},        // { "YYYY-MM-DD": true }
    prizes:defaultPrizes(),
    vault:[],              // 锦囊匣：{uid,name,emoji,tier,merit,redeemed,redeemedAt,gotAt,from,wish}
    heroes:{},             // 武将图鉴：{ 名字: 获得日期 }
    heroCount:{},          // 重复抽到的次数：{ 名字: n }
    draws:0,               // 已揭榜次数（消耗的招贤令）
    bonusTickets:0,        // 家长手动补发的招贤令
    bonusMerit:0,          // 重复武将折算来的军功
    // 账本：历史每一天一经结算就冻结，之后改任务不再追溯改写
    // { "YYYY-MM-DD": { tasks:[快照], done, total, complete, base, mult, merit, ticket, settled, rest } }
    ledger:{},
    peakMerit:0,           // 历史最高累计军功，官职只升不降
    pity:{ sinceLegend:0 },// 距上次出神将已揭榜次数
    graduated:{},          // 已养成的军令：{ taskId: {name,emoji,subject,at,weeks} }
    lastOpen:"",
    // 兑现台：{ id, name, emoji, tier, merit, openedAt, status:"pending"|"done", doneAt, note }
    coupons:[],
    breaks:[],             // 休整期：{ id, from, to, reason }
    extraDays:{},          // 休整期内自愿开工的日子：{ "YYYY-MM-DD": true }
    signals:[],            // 主动性记录：{ date, kind, detail, at }
    hintApplied:{},        // 刚采纳过调整建议的军令：{ taskId: 日期 }
    story:{ book:"三国演义", chapters:SANGUO.slice(), startWeek:mon },
    season:{ name:"第 1 赛季", startDate:mon, endDate:addD(mon,119) },
    reports:{},
    achievements:{},
    createdAt:t
  };
}

const isObj = v => !!v && typeof v==="object" && !Array.isArray(v);

// 按 schema 版本逐级升级老数据。以后加字段，只在这里补一条规则。
function migrate(s){
  if(!isObj(s)) return s;
  if(typeof s.schema!=="number") s.schema = 1;   // 1.5.0 之前的数据没有这个字段

  if(s.schema < 2){
    // v1 → v2：新增兑现台、休整期、自愿开工、主动性记录（类型兜底见下方）
    s.schema = 2;
  }
  if(s.schema < 3){
    // v2 → v3：引入补录窗口。把还落在窗口里的日子从账本里放开，
    // 让「昨天忘了点卯」当场就能补，而更早的历史照旧冻着。
    const floor = addD(TODAY(), -(BACKFILL_DAYS-1));
    if(isObj(s.ledger)) for(const d in s.ledger){ if(d >= floor) delete s.ledger[d]; }
    s.schema = 3;
  }
  if(s.schema < 4){
    // v3 → v4：补发招贤令单独记账。老版本是把 draws 往回减，draws 为 0 时就补不出来。
    if(typeof s.bonusTickets!=="number") s.bonusTickets = 0;
    s.schema = 4;
  }

  // 无论版本，这些字段的类型兜底都要保证
  const d = defaultState();
  for(const k of ["heroes","heroCount","ledger","graduated","records","bossDefeats","reports","achievements","extraDays","hintApplied"])
    if(!isObj(s[k])) s[k]={};
  for(const k of ["vault","coupons","breaks","signals"])
    if(!Array.isArray(s[k])) s[k]=[];
  for(const k of ["bonusMerit","peakMerit","draws","bonusTickets"])
    if(typeof s[k]!=="number" || !isFinite(s[k])) s[k]=0;
  if(!isObj(s.pity)) s.pity={ sinceLegend:0 };
  if(typeof s.pity.sinceLegend!=="number") s.pity.sinceLegend=0;
  if(typeof s.lastOpen!=="string") s.lastOpen="";
  if(typeof s.childName!=="string" || !s.childName) s.childName="主公";
  if(!Array.isArray(s.tasks)||!s.tasks.length) s.tasks=d.tasks;
  if(!Array.isArray(s.prizes)||!s.prizes.length) s.prizes=d.prizes;
  s.season = Object.assign(d.season, isObj(s.season)?s.season:{});
  s.story  = Object.assign(d.story,  isObj(s.story)?s.story:{});
  if(!Array.isArray(s.story.chapters)||!s.story.chapters.length) s.story.chapters=SANGUO.slice();
  if(!s.createdAt) s.createdAt=TODAY();

  // 老数据里已经开掉的锦囊补一张「已兑现」的券，让兑现率算得准
  backfillCoupons(s);
  s.appVersion = APP_VERSION;
  return s;
}
// 有些锦囊在兑现台上线之前就已经开掉了，补一张「已兑现」的券，不然兑现率对不上
function backfillCoupons(s){
  const have=new Set(s.coupons.map(c=>c.name+"|"+c.openedAt));
  for(const v of s.vault){
    if(!v.redeemed) continue;
    const at=v.redeemedAt||v.gotAt||TODAY();
    if(have.has(v.name+"|"+at)) continue;
    s.coupons.push({ id:uid(), name:v.name, emoji:v.emoji||"🎁", tier:v.tier,
      merit:v.merit||0, openedAt:at, status:"done", doneAt:at, note:"", migrated:true });
    have.add(v.name+"|"+at);
  }
  return s;
}
// 把任意来源（localStorage、导入的备份）的对象变成可用的状态
function hydrate(o){
  if(!isObj(o)) return null;
  // 注意：schema 必须取自原数据。defaultState() 自带最新 schema，
  // 直接合并会让老数据「看起来已是最新版」，升级规则一条都不跑。
  const s=Object.assign(defaultState(), o);
  s.schema = typeof o.schema==="number" ? o.schema : 1;
  return migrate(s);
}

// localStorage 在 file:// 协议下会被 WebKit 直接禁用（iPad/iPhone 尤其严格），
// 这时整个应用会变成「用完即忘」，必须明确告诉用户，不能让它悄悄失败。
function storageAvailable(){
  try{
    const k="__sz_probe__";
    localStorage.setItem(k,"1");
    localStorage.removeItem(k);
    return true;
  }catch(e){ return false; }
}
function save(){
  try{
    localStorage.setItem(KEY, JSON.stringify(ST));
    return true;
  }catch(e){
    if(typeof onSaveFailed==="function") onSaveFailed(e);
    return false;
  }
}
function load(){
  try{
    const raw=localStorage.getItem(KEY);
    return raw ? hydrate(JSON.parse(raw)) : null;
  }catch(e){ return null; }
}
