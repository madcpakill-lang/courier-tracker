import { useState, useEffect } from "react";

// ─── constants ────────────────────────────────────────────────────────────
const MR = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MG = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const DW = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const dim = (y,m) => new Date(y,m+1,0).getDate();
const fz  = n => Number(n||0).toFixed(2);
const fi  = n => Math.round(Number(n||0));
const pct = (a,b) => b>0 ? Math.min(Math.round((a/b)*100),999) : 0;
const p2  = n => String(n).padStart(2,"0");
const ds  = (y,m,d) => `${y}-${p2(m+1)}-${p2(d)}`;

const EXP_CATS = [
  {id:"food",   label:"Еда",          icon:"🍲", color:"#4ade80"},
  {id:"fuel",   label:"Топливо",      icon:"⛽", color:"#fbbf24"},
  {id:"smokes", label:"Сигареты",     icon:"🚬", color:"#94a3b8"},
  {id:"transport",label:"Транспорт",  icon:"🚌", color:"#60a5fa"},
  {id:"health", label:"Здоровье",     icon:"💊", color:"#f472b6"},
  {id:"other",  label:"Прочее",       icon:"📦", color:"#a78bfa"},
];

const DEFAULT_BILLS = [
  {id:"rent",    label:"Аренда квартиры", icon:"🏠", day:1,  amount:"", color:"#818cf8"},
  {id:"scooter", label:"Аренда скутера",  icon:"🛵", day:1,  amount:"", color:"#fb923c"},
  {id:"phone",   label:"Телефон",         icon:"📱", day:15, amount:"", color:"#38bdf8"},
  {id:"internet",label:"Интернет",        icon:"🌐", day:10, amount:"", color:"#34d399"},
  {id:"other",   label:"Другой платёж",   icon:"💳", day:1,  amount:"", color:"#f472b6"},
];

const LS = {
  get:(k,d)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):d;}catch{return d;}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}},
};
const KB = "fb2_bills";
const KG = (y,m) => `fb2_goals_${y}`;
const KD = (y,m) => `fb2_days_${y}_${m}`;  // {[dateStr]: {wolt,bolt,expenses:[{cat,amount,label}],note,mood}}
const KP = (y,m) => `fb2_paid_${y}_${m}`;  // {[billId]: amount}

// ─── main ─────────────────────────────────────────────────────────────────
export default function App() {
  const [,tick] = useState(0);
  useEffect(()=>{const t=setInterval(()=>tick(x=>x+1),30000);return()=>clearInterval(t);},[]);

  const NOW = new Date();
  const CY = NOW.getFullYear(), CM = NOW.getMonth(), CD = NOW.getDate();
  const HH = p2(NOW.getHours()), MM = p2(NOW.getMinutes());

  const [tab,  setTab]  = useState("today");
  const [year, setYear] = useState(CY);
  const [mon,  setMon]  = useState(CM);

  const [bills, setBills] = useState(()=>LS.get(KB, DEFAULT_BILLS));
  const [goals, setGoals] = useState(()=>LS.get(KG(CY), []));
  const [dayData, setDayData] = useState(()=>LS.get(KD(CY,CM), {}));
  const [paid, setPaid] = useState(()=>LS.get(KP(CY,CM), {}));

  // selected day for edit
  const [editDay, setEditDay] = useState(null);
  const [eWolt,setEWolt]=useState(""); const [eBolt,setEBolt]=useState("");
  const [eNote,setENote]=useState(""); const [eMood,setEMood]=useState("✅");
  const [eExpCat,setEExpCat]=useState("food"); const [eExpAmt,setEExpAmt]=useState("");
  const [eExpLbl,setEExpLbl]=useState("");

  // reload when month changes
  useEffect(()=>{
    setDayData(LS.get(KD(year,mon),{}));
    setPaid(LS.get(KP(year,mon),{}));
  },[year,mon]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const totalDays = dim(year,mon);
  const totalBills = bills.reduce((s,b)=>s+(parseFloat(b.amount)||0),0);
  const dailyTarget = totalBills>0 ? totalBills/totalDays : 0;

  // aggregate month
  let mWolt=0,mBolt=0,mVarExp=0;
  const moodCount={};
  for(let d=1;d<=totalDays;d++){
    const dk=ds(year,mon,d);
    const dd=dayData[dk]||{};
    mWolt+=parseFloat(dd.wolt)||0;
    mBolt+=parseFloat(dd.bolt)||0;
    (dd.expenses||[]).forEach(e=>mVarExp+=parseFloat(e.amount)||0);
    if(dd.mood) moodCount[dd.mood]=(moodCount[dd.mood]||0)+1;
  }
  const mInc=mWolt+mBolt;

  // T+1: received = all days before today (same month) + previous months handled separately
  const isCurMon = year===CY && mon===CM;
  const todayStr = ds(CY,CM,CD);
  const yDay = new Date(CY,CM,CD-1);
  const yStr = ds(yDay.getFullYear(),yDay.getMonth(),yDay.getDate());

  let onHand=0;
  for(let d=1;d<=totalDays;d++){
    const dk=ds(year,mon,d);
    const dd=dayData[dk]||{};
    const inc=(parseFloat(dd.wolt)||0)+(parseFloat(dd.bolt)||0);
    if(!isCurMon || dk<todayStr) onHand+=inc;
  }

  const mPaid = Object.values(paid).reduce((s,v)=>s+(parseFloat(v)||0),0);
  const netMonth = onHand - totalBills - mVarExp;
  const remaining = Math.max(0, totalBills-onHand);
  const daysLeft = isCurMon ? Math.max(1,totalDays-CD+1) : 1;
  const needPerDay = remaining/daysLeft;
  const monthPct = pct(onHand,totalBills);

  // today
  const todayDD = isCurMon ? (dayData[todayStr]||{}) : {};
  const todayInc = (parseFloat(todayDD.wolt)||0)+(parseFloat(todayDD.bolt)||0);
  const todayExp = (todayDD.expenses||[]).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const todayNet = todayInc-todayExp;
  const todayPct = pct(todayInc,dailyTarget);
  const dayColor = todayPct>=100?"#22c55e":todayPct>=70?"#fbbf24":"#f97316";

  // arrived today (yesterday's work)
  const yDD = isCurMon ? (dayData[yStr]||{}) : {};
  const arrivedToday = (parseFloat(yDD.wolt)||0)+(parseFloat(yDD.bolt)||0);

  // upcoming bills
  const upcoming=[];
  for(let off=0;off<=60;off++){
    const dt=new Date(CY,CM,CD+off);
    bills.forEach(b=>{
      if(!parseFloat(b.amount))return;
      if(b.day===dt.getDate()) upcoming.push({...b,daysAway:off,dtDate:`${dt.getDate()} ${MG[dt.getMonth()]}`,dtMon:dt.getMonth()});
    });
  }
  const nextBill=upcoming[0]||null;

  // expense breakdown
  const expBycat={};
  for(let d=1;d<=totalDays;d++){
    const dk=ds(year,mon,d);
    (dayData[dk]?.expenses||[]).forEach(e=>{
      if(!expBycat[e.cat]) expBycat[e.cat]={amount:0,cat:e.cat};
      expBycat[e.cat].amount+=parseFloat(e.amount)||0;
    });
  }
  const totalAllExp=totalBills+mVarExp;

  // worked days
  let workedDays=0;
  for(let d=1;d<=totalDays;d++){
    const dd=dayData[ds(year,mon,d)]||{};
    if((parseFloat(dd.wolt)||0)+(parseFloat(dd.bolt)||0)>0) workedDays++;
  }
  const avgPerDay=workedDays>0?mInc/workedDays:0;

  // ── mutations ─────────────────────────────────────────────────────────────
  function mutDay(dateStr, fn) {
    setDayData(prev=>{
      const n={...prev};
      if(!n[dateStr]) n[dateStr]={wolt:"",bolt:"",expenses:[],note:"",mood:"✅"};
      fn(n[dateStr]);
      LS.set(KD(year,mon),n);
      return n;
    });
  }

  function openEdit(d) {
    const dk=ds(year,mon,d);
    const dd=dayData[dk]||{};
    setEditDay(d);
    setEWolt(dd.wolt||""); setEBolt(dd.bolt||"");
    setENote(dd.note||""); setEMood(dd.mood||"✅");
    setEExpCat("food"); setEExpAmt(""); setEExpLbl("");
  }

  function saveEdit() {
    const dk=ds(year,mon,editDay);
    mutDay(dk,d=>{d.wolt=eWolt;d.bolt=eBolt;d.note=eNote;d.mood=eMood;});
    setEditDay(null);
  }

  function addExp() {
    if(!parseFloat(eExpAmt))return;
    const dk=ds(year,mon,editDay);
    const cat=EXP_CATS.find(c=>c.id===eExpCat);
    mutDay(dk,d=>{
      if(!d.expenses)d.expenses=[];
      d.expenses.push({id:Date.now(),cat:eExpCat,label:eExpLbl||cat?.label||"",amount:String(parseFloat(eExpAmt))});
    });
    setEExpAmt(""); setEExpLbl("");
  }

  function delExp(dk,id) {
    mutDay(dk,d=>{d.expenses=(d.expenses||[]).filter(e=>e.id!==id);});
  }

  function updateBill(id,f,v){const n=bills.map(b=>b.id===id?{...b,[f]:v}:b);setBills(n);LS.set(KB,n);}
  function updatePaid(id,v){const n={...paid,[id]:v};setPaid(n);LS.set(KP(year,mon),n);}

  function addGoal(){
    const n=[...goals,{id:Date.now(),label:"",target:"",saved:"",deadline:"",status:"🔥"}];
    setGoals(n);LS.set(KG(year),n);
  }
  function updateGoal(id,f,v){const n=goals.map(g=>g.id===id?{...g,[f]:v}:g);setGoals(n);LS.set(KG(year),n);}
  function delGoal(id){const n=goals.filter(g=>g.id!==id);setGoals(n);LS.set(KG(year),n);}

  function prevMon(){if(mon===0){setYear(y=>y-1);setMon(11);}else setMon(m=>m-1);}
  function nextMon(){if(mon===11){setYear(y=>y+1);setMon(0);}else setMon(m=>m+1);}

  // calendar grid
  const firstDow=(new Date(year,mon,1).getDay()+6)%7;
  const calCells=[];
  for(let i=0;i<firstDow;i++) calCells.push(null);
  for(let d=1;d<=totalDays;d++) calCells.push(d);

  const moods=["🔥","✅","😴","🌧"];

  return (
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}} *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}`}</style>

      {/* ── NAV ── */}
      <div style={S.nav}>
        {[["today","⚡"],["calendar","📅"],["month","📊"],["payments","💳"],["goals","🎯"],["settings","⚙️"]].map(([id,ic])=>(
          <button key={id} style={{...S.nb,...(tab===id?S.nbOn:{})}} onClick={()=>setTab(id)}>{ic}</button>
        ))}
      </div>

      {/* ══════ TODAY ══════ */}
      {tab==="today"&&(<>
        <div style={S.hdr}>
          <div>
            <div style={S.clock}>{HH}<span style={{animation:"pulse 2s ease-in-out infinite",display:"inline-block"}}>:</span>{MM}</div>
            <div style={S.dstr}>{DW[NOW.getDay()]} · {CD} {MG[CM]} {CY}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={S.logo}>🛵 КурьерP&L</div>
            {arrivedToday>0&&<div style={S.arrived}>+{fz(arrivedToday)} zł пришло</div>}
          </div>
        </div>

        {/* BIG PNL */}
        <div style={{...S.pnlCard,borderColor:dayColor+"55"}}>
          <div style={S.pnlRow}>
            <div>
              <div style={S.micro}>P&L СЕГОДНЯ · {HH}:{MM}</div>
              <div style={{...S.pnlBig,color:dayColor}}>
                {todayPct===0?"0%":todayPct>=100?`+${todayPct-100}%`:`−${100-todayPct}%`}
              </div>
              <div style={{fontSize:10,color:dayColor,fontFamily:"'JetBrains Mono'",marginTop:4}}>
                {todayPct>=100?`+${fz(todayInc-dailyTarget)} zł сверх цели`:
                 todayPct>0?`ещё ${fz(dailyTarget-todayInc)} zł до цели`:
                 `цель ${fz(dailyTarget)} zł`}
              </div>
            </div>
            <svg viewBox="0 0 100 60" style={{width:90,flexShrink:0}}>
              <path d="M10 55 A45 45 0 0 1 90 55" fill="none" stroke="#182030" strokeWidth="10" strokeLinecap="round"/>
              {todayPct>0&&<path d="M10 55 A45 45 0 0 1 90 55" fill="none" stroke={dayColor} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${Math.min(todayPct,100)*1.41} 999`} style={{transition:"stroke-dasharray .8s ease"}}/>}
              <text x="50" y="50" textAnchor="middle" fill={dayColor} fontSize="13" fontWeight="900" fontFamily="'Unbounded'">{Math.min(todayPct,100)}%</text>
            </svg>
          </div>
          <div style={S.statRow}>
            <Stat l="Wolt" v={fz(parseFloat(todayDD.wolt)||0)} c="#00c2e0"/>
            <div style={S.sd}/>
            <Stat l="Bolt" v={fz(parseFloat(todayDD.bolt)||0)} c="#34d45a"/>
            <div style={S.sd}/>
            <Stat l="Расход" v={fz(todayExp)} c="#ef4444"/>
            <div style={S.sd}/>
            <Stat l="Нетто" v={(todayNet>=0?"+":"")+fz(todayNet)} c={todayNet>=0?"#22c55e":"#f97316"}/>
          </div>
          <div style={S.dayBar}><div style={{...S.dayBarF,width:`${Math.min(todayPct,100)}%`,background:dayColor}}/></div>
        </div>

        {/* ADVICE */}
        {(()=>{
          let emoji="🛵",text=`Цель ${fz(dailyTarget)} zł — начни смену`,color="#475569";
          if(nextBill&&nextBill.daysAway===0&&onHand<parseFloat(nextBill.amount)){emoji="🚨";text=`Сегодня платёж ${nextBill.label} — срочно нужно ${fz(parseFloat(nextBill.amount)-onHand)} zł`;color="#ef4444";}
          else if(nextBill&&nextBill.daysAway<=3&&onHand<parseFloat(nextBill.amount)){emoji="⚡";text=`Через ${nextBill.daysAway} дн платёж ${fz(parseFloat(nextBill.amount))} zł — поднажми`;color="#f97316";}
          else if(todayPct>=130){emoji="🔥";text="Отличный день! Можешь заканчивать";color="#22c55e";}
          else if(todayPct>=100){emoji="✅";text="Цель выполнена. Каждый заказ — чистый плюс";color="#22c55e";}
          else if(needPerDay>dailyTarget*1.5){emoji="📊";text=`Отставание! Нужно ${fz(needPerDay)} zł/день`;color="#f97316";}
          return <div style={{...S.advice,borderColor:color+"44"}}><span style={{fontSize:20}}>{emoji}</span><span style={{...S.advTxt,color}}>{text}</span></div>;
        })()}

        {/* MONTH MINI */}
        <div style={S.card}>
          <div style={S.cLabel}>МЕСЯЦ · {MR[CM]}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <span style={{fontSize:26,fontWeight:900,color:netMonth>=0?"#22c55e":"#f97316",letterSpacing:"-2px"}}>{monthPct}%</span>
              <span style={{fontSize:10,color:"#334155",marginLeft:6}}>цели</span>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:14,fontWeight:900,color:netMonth>=0?"#22c55e":"#f97316",fontFamily:"'JetBrains Mono'"}}>{netMonth>=0?"+":""}{fz(netMonth)} zł</div>
              <div style={{fontSize:9,color:"#334155",fontFamily:"'JetBrains Mono'"}}>нетто месяца</div>
            </div>
          </div>
          <div style={S.mBar}><div style={{...S.mBarF,width:`${Math.min(monthPct,100)}%`,background:monthPct>=100?"linear-gradient(90deg,#16a34a,#22c55e)":monthPct>=60?"linear-gradient(90deg,#d97706,#fbbf24)":"linear-gradient(90deg,#be123c,#f43f5e)"}}/></div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:8,gap:8}}>
            <MItem l="Получено" v={fz(onHand)+" zł"} c="#22c55e"/>
            <MItem l="До нуля" v={fz(remaining)+" zł"} c="#fbbf24"/>
            <MItem l="Нужно/день" v={fz(needPerDay)+" zł"} c={needPerDay>dailyTarget*1.3?"#ef4444":"#fbbf24"}/>
          </div>
        </div>

        {/* NEXT PAYMENT */}
        {nextBill&&(
          <div style={{...S.nextCard,borderColor:nextBill.daysAway<=1?"#ef444466":nextBill.daysAway<=3?"#f9731666":nextBill.daysAway<=7?"#fbbf2444":"#182030"}}>
            <span style={{fontSize:24}}>{nextBill.icon}</span>
            <div style={{flex:1}}>
              <div style={S.micro}>БЛИЖАЙШИЙ ПЛАТЁЖ</div>
              <div style={{fontSize:12,fontWeight:700}}>{nextBill.label}</div>
              <div style={{fontSize:9,color:"#475569",fontFamily:"'JetBrains Mono'",marginTop:2}}>{nextBill.dtDate}</div>
              <div style={S.covBar}><div style={{...S.covFill,width:`${pct(Math.min(onHand,parseFloat(nextBill.amount)),parseFloat(nextBill.amount))}%`,background:onHand>=parseFloat(nextBill.amount)?"#22c55e":"#f97316"}}/></div>
              <div style={{fontSize:8,color:"#334155",fontFamily:"'JetBrains Mono'",marginTop:2}}>{fz(Math.min(onHand,parseFloat(nextBill.amount)))} / {fz(parseFloat(nextBill.amount))} zł</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:17,fontWeight:900,fontFamily:"'JetBrains Mono'"}}>{fz(parseFloat(nextBill.amount))} zł</div>
              <div style={{fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono'",color:nextBill.daysAway===0?"#ef4444":nextBill.daysAway<=3?"#f97316":nextBill.daysAway<=7?"#fbbf24":"#22c55e"}}>
                {nextBill.daysAway===0?"⚠️ СЕГОДНЯ":nextBill.daysAway===1?"ЗАВТРА":`через ${nextBill.daysAway} дн`}
              </div>
            </div>
          </div>
        )}

        {/* TODAY DETAIL */}
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={S.cLabel}>СЕГОДНЯ — {CD} {MG[CM]}</div>
            <button style={S.editBtn} onClick={()=>openEdit(CD)}>✏️ Внести данные</button>
          </div>
          {todayInc===0&&todayExp===0
            ? <div style={S.empty}>Нажми «Внести данные» чтобы добавить заработок за сегодня</div>
            : <>
              {(parseFloat(todayDD.wolt)||0)>0&&<ERow icon="🔵" label="Wolt" val={fz(parseFloat(todayDD.wolt))} color="#00c2e0"/>}
              {(parseFloat(todayDD.bolt)||0)>0&&<ERow icon="🟢" label="Bolt" val={fz(parseFloat(todayDD.bolt))} color="#34d45a"/>}
              {(todayDD.expenses||[]).map(e=>{
                const cat=EXP_CATS.find(c=>c.id===e.cat);
                return <ERow key={e.id} icon={cat?.icon||"📦"} label={e.label} val={`−${fz(parseFloat(e.amount))}`} color="#ef4444"
                  onDel={()=>delExp(todayStr,e.id)}/>;
              })}
              {todayDD.note&&<div style={{fontSize:10,color:"#475569",fontFamily:"'JetBrains Mono'",marginTop:6,fontStyle:"italic"}}>💬 {todayDD.note}</div>}
            </>
          }
        </div>
        <div style={{height:20}}/>
      </>)}

      {/* ══════ CALENDAR ══════ */}
      {tab==="calendar"&&(
        <div style={S.body}>
          <div style={S.monNav}>
            <button style={S.mnBtn} onClick={prevMon}>‹</button>
            <span style={S.monLbl}>{MR[mon]} {year}</span>
            <button style={S.mnBtn} onClick={nextMon}>›</button>
          </div>

          {/* calendar grid */}
          <div style={S.calGrid}>
            {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(w=><div key={w} style={S.calWd}>{w}</div>)}
            {calCells.map((d,i)=>{
              if(!d) return <div key={"e"+i}/>;
              const dk=ds(year,mon,d);
              const dd=dayData[dk]||{};
              const inc=(parseFloat(dd.wolt)||0)+(parseFloat(dd.bolt)||0);
              const exp=(dd.expenses||[]).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const net=inc-exp;
              const isT=isCurMon&&d===CD;
              const isFut=isCurMon&&d>CD;
              return(
                <div key={d} style={{...S.calCell,...(isT?S.calToday:{}),...(inc>0?{borderColor:net>=0?"#16a34a55":"#ef444433"}:{}),...(isFut?{opacity:.4}:{})}}
                  onClick={()=>{if(!isFut){openEdit(d);setTab("edit");}}} >
                  <div style={{...S.calDN,...(isT?{color:"#60a5fa"}:{color:inc>0?"#e2e8f0":"#334155"})}}>{d}</div>
                  {dd.mood&&inc>0&&<div style={{fontSize:9,lineHeight:1}}>{dd.mood}</div>}
                  {inc>0&&<div style={{fontSize:7,color:"#22c55e",fontFamily:"'JetBrains Mono'"}}>+{fi(inc)}</div>}
                  {exp>0&&<div style={{fontSize:7,color:"#f97316",fontFamily:"'JetBrains Mono'"}}>−{fi(exp)}</div>}
                  {inc>0&&<div style={{fontSize:7,fontFamily:"'JetBrains Mono'",color:net>=0?"#22c55e":"#f97316",fontWeight:700}}>{net>=0?"+":""}{fi(net)}</div>}
                </div>
              );
            })}
          </div>
          <div style={S.calLeg}>
            <span style={{color:"#22c55e"}}>+доход</span>
            <span style={{color:"#f97316"}}>−расход</span>
            <span style={{color:"#94a3b8"}}>=нетто</span>
            <span style={{color:"#60a5fa"}}>●сегодня</span>
          </div>

          {/* day list */}
          <div style={{marginTop:4}}>
            {Array.from({length:totalDays},(_,i)=>i+1).reverse().map(d=>{
              const dk=ds(year,mon,d);
              const dd=dayData[dk]||{};
              const inc=(parseFloat(dd.wolt)||0)+(parseFloat(dd.bolt)||0);
              const exp=(dd.expenses||[]).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
              const net=inc-exp;
              const dp=pct(inc,dailyTarget);
              if(!inc&&!exp&&!dd.note) return null;
              const isFut=isCurMon&&d>CD;
              if(isFut) return null;
              return(
                <div key={d} style={S.dayRow} onClick={()=>{openEdit(d);setTab("edit");}}>
                  <div style={S.dayNum}>
                    <div style={{fontSize:16,fontWeight:900,color:"#94a3b8",lineHeight:1}}>{d}</div>
                    <div style={{fontSize:8,color:"#253347",fontFamily:"'JetBrains Mono'"}}>{DW[new Date(year,mon,d).getDay()]}</div>
                    {dd.mood&&<div style={{fontSize:11}}>{dd.mood}</div>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontFamily:"'JetBrains Mono'",fontSize:13,fontWeight:700,color:"#22c55e"}}>{fz(inc)} zł</span>
                      <span style={{...S.pctBdg,color:dp>=100?"#22c55e":dp>=70?"#fbbf24":"#f97316",borderColor:dp>=100?"#16a34a33":"#f9731633"}}>{dp}%</span>
                    </div>
                    {exp>0&&<div style={{fontSize:9,color:"#ef4444",fontFamily:"'JetBrains Mono'"}}>расход {fz(exp)} · нетто {net>=0?"+":""}{fz(net)}</div>}
                    {dd.note&&<div style={{fontSize:9,color:"#475569",fontFamily:"'JetBrains Mono'",marginTop:2}}>💬 {dd.note}</div>}
                    {(dd.expenses||[]).map(e=>{
                      const cat=EXP_CATS.find(c=>c.id===e.cat);
                      return <span key={e.id} style={{fontSize:8,color:cat?.color||"#94a3b8",fontFamily:"'JetBrains Mono'",marginRight:6}}>{cat?.icon} {e.label} {fz(parseFloat(e.amount))}</span>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════ EDIT DAY (modal-like tab) ══════ */}
      {tab==="edit"&&editDay!==null&&(()=>{
        const dk=ds(year,mon,editDay);
        const dd=dayData[dk]||{};
        const inc=(parseFloat(dd.wolt)||0)+(parseFloat(dd.bolt)||0);
        const exp=(dd.expenses||[]).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
        const net=inc-exp;
        const dp=pct(inc,dailyTarget);
        return(
          <div style={S.body}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <button style={S.back} onClick={()=>setTab("calendar")}>← Назад</button>
              <div style={{fontSize:14,fontWeight:700}}>{editDay} {MG[mon]} {year} · {DW[new Date(year,mon,editDay).getDay()]}</div>
            </div>

            {/* summary */}
            {inc>0&&(
              <div style={{...S.card,marginBottom:12,borderColor:net>=0?"#16a34a33":"#ef444433"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div><div style={S.micro}>ИТОГ ДНЯ</div><div style={{fontSize:20,fontWeight:900,color:"#22c55e",fontFamily:"'JetBrains Mono'"}}>{fz(inc)} zł</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:700,color:net>=0?"#22c55e":"#f97316",fontFamily:"'JetBrains Mono'"}}>{net>=0?"+":""}{fz(net)} нетто</div><div style={{...S.pctBdg,color:dp>=100?"#22c55e":dp>=70?"#fbbf24":"#f97316",borderColor:"transparent",marginTop:4}}>{dp}% цели</div></div>
                </div>
              </div>
            )}

            {/* income */}
            <div style={S.card}>
              <div style={S.cLabel}>ДОХОД</div>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={S.fl}><span style={{...S.dot,background:"#00c2e0"}}/>Wolt (zł)</div>
                  <input style={S.inp} type="number" min="0" placeholder="0.00" inputMode="decimal" value={eWolt} onChange={e=>setEWolt(e.target.value)}/>
                </div>
                <div style={{flex:1}}>
                  <div style={S.fl}><span style={{...S.dot,background:"#34d45a"}}/>Bolt (zł)</div>
                  <input style={S.inp} type="number" min="0" placeholder="0.00" inputMode="decimal" value={eBolt} onChange={e=>setEBolt(e.target.value)}/>
                </div>
              </div>
              <div style={S.fl}>Настроение дня</div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                {moods.map(m=>(
                  <button key={m} style={{...S.moodBtn,...(eMood===m?S.moodOn:{})}} onClick={()=>setEMood(m)}>{m}</button>
                ))}
              </div>
              <div style={S.fl}>Заметка</div>
              <input style={{...S.inp,marginBottom:10}} type="text" placeholder="Как прошёл день…" value={eNote} onChange={e=>setENote(e.target.value)}/>
              <button style={S.saveBtn} onClick={saveEdit}>✓ Сохранить доход</button>
            </div>

            {/* expenses */}
            <div style={S.card}>
              <div style={S.cLabel}>РАСХОДЫ ДНЯ</div>
              {(dd.expenses||[]).map(e=>{
                const cat=EXP_CATS.find(c=>c.id===e.cat);
                return(
                  <div key={e.id} style={S.expItm}>
                    <span style={{fontSize:16}}>{cat?.icon||"📦"}</span>
                    <span style={{flex:1,fontSize:11}}>{e.label}</span>
                    <span style={{color:"#ef4444",fontFamily:"'JetBrains Mono'",fontSize:11,fontWeight:700}}>{fz(parseFloat(e.amount))} zł</span>
                    <button style={S.delBtn2} onClick={()=>delExp(dk,e.id)}>✕</button>
                  </div>
                );
              })}
              {(dd.expenses||[]).length===0&&<div style={S.empty}>Нет расходов</div>}
              <div style={{marginTop:10}}>
                <div style={S.fl}>Категория</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                  {EXP_CATS.map(c=>(
                    <button key={c.id} style={{...S.catBtn,...(eExpCat===c.id?{...S.catOn,borderColor:c.color,color:c.color}:{})}} onClick={()=>setEExpCat(c.id)}>
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
                <div style={S.fl}>Название (необязательно)</div>
                <input style={{...S.inp,marginBottom:7}} type="text" placeholder={EXP_CATS.find(c=>c.id===eExpCat)?.label} value={eExpLbl} onChange={e=>setEExpLbl(e.target.value)}/>
                <div style={S.fl}>Сумма (zł)</div>
                <input style={{...S.inp,marginBottom:9}} type="number" min="0" placeholder="0.00" inputMode="decimal" value={eExpAmt} onChange={e=>setEExpAmt(e.target.value)}/>
                <button style={{...S.saveBtn,background:"linear-gradient(135deg,#b45309,#d97706)"}} onClick={addExp}>＋ Добавить расход</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════ MONTH STATS ══════ */}
      {tab==="month"&&(
        <div style={S.body}>
          <div style={S.monNav}>
            <button style={S.mnBtn} onClick={prevMon}>‹</button>
            <span style={S.monLbl}>{MR[mon]} {year}</span>
            <button style={S.mnBtn} onClick={nextMon}>›</button>
          </div>

          {/* main stats */}
          <div style={S.card}>
            <div style={S.cLabel}>ИТОГИ МЕСЯЦА</div>
            <div style={{display:"flex",gap:0,marginBottom:12}}>
              <BigStat l="Заработано" v={fz(mInc)} u="zł" c="#22c55e"/>
              <div style={S.sd}/>
              <BigStat l="Получено" v={fz(onHand)} u="zł" c="#60a5fa"/>
              <div style={S.sd}/>
              <BigStat l="Нетто" v={(netMonth>=0?"+":"")+fz(netMonth)} u="zł" c={netMonth>=0?"#22c55e":"#f97316"}/>
            </div>
            <div style={S.mBar}><div style={{...S.mBarF,width:`${Math.min(monthPct,100)}%`,background:monthPct>=100?"linear-gradient(90deg,#16a34a,#22c55e)":monthPct>=60?"linear-gradient(90deg,#d97706,#fbbf24)":"linear-gradient(90deg,#be123c,#f43f5e)"}}/></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#334155",fontFamily:"'JetBrains Mono'",marginTop:4,marginBottom:12}}>
              <span>0</span><span>{fz(onHand)} получено</span><span>цель {fz(totalBills)} zł</span>
            </div>
            <StatRow l="Wolt" v={fz(mWolt)+" zł"} c="#00c2e0"/>
            <StatRow l="Bolt" v={fz(mBolt)+" zł"} c="#34d45a"/>
            <StatRow l="Дней работал" v={workedDays+" дн"}/>
            <StatRow l="Среднее в день" v={fz(avgPerDay)+" zł"} c="#60a5fa"/>
            <StatRow l="Цель в день" v={fz(dailyTarget)+" zł"} c="#fbbf24"/>
            <StatRow l="Нужно ещё/день" v={fz(needPerDay)+" zł"} c={needPerDay>dailyTarget*1.3?"#ef4444":"#fbbf24"}/>
            <StatRow l="Дней осталось" v={String(daysLeft)}/>
          </div>

          {/* expense breakdown */}
          <div style={S.card}>
            <div style={S.cLabel}>РАСХОДЫ МЕСЯЦА</div>
            <StatRow l="Постоянные (платежи)" v={fz(totalBills)+" zł"} c="#818cf8"/>
            <StatRow l="Переменные (ежедневные)" v={fz(mVarExp)+" zł"} c="#f97316"/>
            <StatRow l="ИТОГО" v={fz(totalAllExp)+" zł"} c="#ef4444" bold/>
            <div style={{marginTop:12}}>
              {EXP_CATS.map(cat=>{
                const amt=expBycat[cat.id]?.amount||0;
                if(!amt) return null;
                const p=totalAllExp>0?Math.round((amt/totalAllExp)*100):0;
                return(
                  <div key={cat.id} style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}>
                      <span>{cat.icon} {cat.label}</span>
                      <span style={{color:cat.color,fontFamily:"'JetBrains Mono'"}}>{fz(amt)} zł · {p}%</span>
                    </div>
                    <div style={{height:5,background:"#182030",borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${p}%`,background:cat.color,borderRadius:99}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* mood stats */}
          {Object.keys(moodCount).length>0&&(
            <div style={S.card}>
              <div style={S.cLabel}>НАСТРОЕНИЕ МЕСЯЦА</div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                {moods.filter(m=>moodCount[m]).map(m=>(
                  <div key={m} style={{textAlign:"center"}}>
                    <div style={{fontSize:24}}>{m}</div>
                    <div style={{fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono'"}}>{moodCount[m]} дн</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════ PAYMENTS ══════ */}
      {tab==="payments"&&(
        <div style={S.body}>
          <div style={S.monNav}>
            <button style={S.mnBtn} onClick={prevMon}>‹</button>
            <span style={S.monLbl}>{MR[mon]} {year}</span>
            <button style={S.mnBtn} onClick={nextMon}>›</button>
          </div>

          <div style={S.card}>
            <div style={S.cLabel}>СТАТУС ПЛАТЕЖЕЙ</div>
            <StatRow l="Всего к оплате" v={fz(totalBills)+" zł"} c="#ef4444"/>
            <StatRow l="Оплачено" v={fz(mPaid)+" zł"} c="#22c55e"/>
            <StatRow l="Остаток" v={fz(Math.max(0,totalBills-mPaid))+" zł"} c="#fbbf24"/>
            <div style={S.mBar}><div style={{...S.mBarF,width:`${pct(mPaid,totalBills)}%`,background:"linear-gradient(90deg,#16a34a,#22c55e)"}}/></div>
          </div>

          {upcoming.slice(0,8).map((b,i)=>{
            const amt=parseFloat(b.amount)||0;
            const paidAmt=parseFloat(paid[b.id])||0;
            const p=pct(Math.min(onHand,amt),amt);
            return(
              <div key={b.id+i} style={{...S.payCard,borderColor:b.daysAway===0?"#ef444466":b.daysAway<=3?"#f9731666":b.daysAway<=7?"#fbbf2444":"#182030"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:8,color:b.daysAway<=1?"#ef4444":b.daysAway<=3?"#f97316":b.daysAway<=7?"#fbbf24":"#475569",fontFamily:"'JetBrains Mono'",marginBottom:3}}>
                      {b.daysAway===0?"⚠️ СЕГОДНЯ":b.daysAway===1?"ЗАВТРА":`через ${b.daysAway} дн · ${b.dtDate}`}
                    </div>
                    <div style={{fontSize:13,fontWeight:700}}>{b.icon} {b.label}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:16,fontWeight:900,fontFamily:"'JetBrains Mono'",color:paidAmt>=amt?"#22c55e":"#e2e8f0"}}>{fz(amt)} zł</div>
                    {paidAmt>=amt?<div style={{fontSize:9,color:"#22c55e"}}>✓ оплачено</div>:onHand<amt?<div style={{fontSize:9,color:"#ef4444",fontFamily:"'JetBrains Mono'"}}>−{fz(amt-onHand)} zł</div>:null}
                  </div>
                </div>
                <div style={{height:6,background:"#182030",borderRadius:99,overflow:"hidden",marginBottom:6}}>
                  <div style={{height:"100%",width:`${Math.min(p,100)}%`,background:p>=100?"#22c55e":p>=60?"#fbbf24":"#f97316",borderRadius:99,transition:"width .5s"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:8,color:"#334155",fontFamily:"'JetBrains Mono'"}}>{fz(Math.min(onHand,amt))} / {fz(amt)} zł накоплено</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:9,color:"#475569",fontFamily:"'JetBrains Mono'"}}>оплачено:</span>
                    <input style={{...S.inp,width:80,padding:"4px 8px",fontSize:12,textAlign:"right"}}
                      type="number" min="0" placeholder="0" value={paid[b.id]||""}
                      onChange={e=>updatePaid(b.id,e.target.value)}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════ GOALS ══════ */}
      {tab==="goals"&&(
        <div style={S.body}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:"#94a3b8"}}>🎯 Мои цели</div>
            <button style={S.addGoalBtn} onClick={addGoal}>＋ Новая цель</button>
          </div>

          {goals.length===0&&<div style={S.empty}>Нажми «Новая цель» чтобы добавить</div>}
          {goals.map(g=>{
            const p=parseFloat(g.target)>0?pct(parseFloat(g.saved),parseFloat(g.target)):0;
            const left=Math.max(0,(parseFloat(g.target)||0)-(parseFloat(g.saved)||0));
            return(
              <div key={g.id} style={S.goalCard}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <input style={{...S.inp,flex:1,marginRight:8,fontSize:13,fontWeight:700}} placeholder="На что коплю…" value={g.label} onChange={e=>updateGoal(g.id,"label",e.target.value)}/>
                  <button style={S.delGBtn} onClick={()=>delGoal(g.id)}>✕</button>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={S.fl}>Нужно (zł)</div>
                    <input style={S.inp} type="number" placeholder="0" value={g.target} onChange={e=>updateGoal(g.id,"target",e.target.value)}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={S.fl}>Накоплено (zł)</div>
                    <input style={S.inp} type="number" placeholder="0" value={g.saved} onChange={e=>updateGoal(g.id,"saved",e.target.value)}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={S.fl}>Дедлайн</div>
                    <input style={{...S.inp,fontSize:11}} type="date" value={g.deadline} onChange={e=>updateGoal(g.id,"deadline",e.target.value)}/>
                  </div>
                </div>
                {parseFloat(g.target)>0&&(<>
                  <div style={{height:8,background:"#182030",borderRadius:99,overflow:"hidden",marginBottom:5}}>
                    <div style={{height:"100%",width:`${Math.min(p,100)}%`,background:p>=100?"linear-gradient(90deg,#16a34a,#22c55e)":p>=60?"linear-gradient(90deg,#d97706,#fbbf24)":"linear-gradient(90deg,#1d4ed8,#60a5fa)",borderRadius:99,transition:"width .5s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,fontFamily:"'JetBrains Mono'"}}>
                    <span style={{color:p>=100?"#22c55e":"#60a5fa"}}>{p}% · {fz(parseFloat(g.saved)||0)} zł</span>
                    {p<100&&<span style={{color:"#334155"}}>осталось {fz(left)} zł</span>}
                    {p>=100&&<span style={{color:"#22c55e"}}>✓ Цель достигнута!</span>}
                  </div>
                </>)}
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  {["🔥","⏸","✅"].map(s=>(
                    <button key={s} style={{...S.moodBtn,...(g.status===s?S.moodOn:{})}} onClick={()=>updateGoal(g.id,"status",s)}>{s}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════ SETTINGS ══════ */}
      {tab==="settings"&&(
        <div style={S.body}>
          <div style={{fontSize:14,fontWeight:700,color:"#94a3b8",marginBottom:14}}>⚙️ Мои платежи</div>
          <div style={S.infoBox}>Введи сумму и число месяца когда списывается каждый платёж. Это основа всех расчётов.</div>
          {bills.map(b=>(
            <div key={b.id} style={S.setCard}>
              <div style={{fontSize:22,width:28,marginTop:6,flexShrink:0}}>{b.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:700,color:b.color||"#94a3b8",marginBottom:7}}>{b.label}</div>
                <div style={{display:"flex",gap:8}}>
                  <div style={{flex:2}}>
                    <div style={S.fl}>Сумма (zł)</div>
                    <input style={S.inp} type="number" min="0" placeholder="0" inputMode="decimal"
                      value={b.amount} onChange={e=>updateBill(b.id,"amount",e.target.value)}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={S.fl}>Число</div>
                    <input style={S.inp} type="number" min="1" max="31" placeholder="1"
                      value={b.day} onChange={e=>updateBill(b.id,"day",parseInt(e.target.value)||1)}/>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div style={{textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:11,color:"#475569",marginTop:8}}>
            Итого: <span style={{color:"#ef4444"}}>{fz(totalBills)} zł / мес</span>
          </div>
          <div style={{textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:11,color:"#475569",marginTop:4,marginBottom:20}}>
            Цель в день: <span style={{color:"#fbbf24"}}>{fz(dailyTarget)} zł</span>
          </div>
          <div style={S.infoBox}>
            {"T+1: Wolt и Bolt переводят деньги на следующий день после смены. Поэтому «Получено» — это только вчерашний и более ранний заработок. Сегодняшний заработок придёт завтра."}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────
function Stat({l,v,c="#e2e8f0"}) {
  return <div style={{flex:1,textAlign:"center",padding:"8px 4px"}}>
    <div style={{fontSize:7,color:"#253347",fontFamily:"'JetBrains Mono'",marginBottom:3}}>{l}</div>
    <div style={{fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono'",color:c}}>{v}</div>
  </div>;
}
function BigStat({l,v,u,c="#e2e8f0"}) {
  return <div style={{flex:1,textAlign:"center",padding:"8px 4px"}}>
    <div style={{fontSize:7,color:"#253347",fontFamily:"'JetBrains Mono'",marginBottom:3}}>{l}</div>
    <div style={{fontSize:14,fontWeight:900,fontFamily:"'JetBrains Mono'",color:c,letterSpacing:"-0.5px"}}>{v}<span style={{fontSize:9,fontWeight:400}}> {u}</span></div>
  </div>;
}
function StatRow({l,v,c="#94a3b8",bold}) {
  return <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #182030",fontSize:11}}>
    <span style={{color:"#475569"}}>{l}</span>
    <span style={{color:c,fontFamily:"'JetBrains Mono'",fontWeight:bold?700:500}}>{v}</span>
  </div>;
}
function MItem({l,v,c="#94a3b8"}) {
  return <div style={{flex:1,textAlign:"center"}}>
    <div style={{fontSize:7,color:"#253347",fontFamily:"'JetBrains Mono'",marginBottom:2}}>{l}</div>
    <div style={{fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono'",color:c}}>{v}</div>
  </div>;
}
function ERow({icon,label,val,color,onDel}) {
  return <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderTop:"1px solid #182030"}}>
    <span style={{fontSize:14}}>{icon}</span>
    <span style={{flex:1,fontSize:11,color:"#94a3b8"}}>{label}</span>
    <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,fontWeight:700,color}}>{val} zł</span>
    {onDel&&<button style={{background:"none",border:"none",color:"#253347",cursor:"pointer",fontSize:11}} onClick={onDel}>✕</button>}
  </div>;
}

// ─── styles ───────────────────────────────────────────────────────────────
const S = {
  root:{fontFamily:"'Unbounded',sans-serif",background:"#060911",minHeight:"100vh",color:"#e2e8f0",maxWidth:480,margin:"0 auto"},
  nav:{display:"flex",background:"#0b0f1b",borderBottom:"1px solid #182030",position:"sticky",top:0,zIndex:50},
  nb:{flex:1,padding:"12px 4px",background:"none",border:"none",borderBottom:"2px solid transparent",color:"#253347",fontSize:18,cursor:"pointer"},
  nbOn:{color:"#e2e8f0",borderBottom:"2px solid #3b82f6"},
  hdr:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"14px 14px 10px",background:"#0b0f1b"},
  clock:{fontSize:30,fontWeight:900,fontFamily:"'JetBrains Mono'",letterSpacing:-2,lineHeight:1},
  dstr:{fontSize:9,color:"#334155",fontFamily:"'JetBrains Mono'",marginTop:2},
  logo:{fontSize:13,fontWeight:900,letterSpacing:"-0.5px"},
  arrived:{background:"#052e16",border:"1px solid #16a34a44",color:"#22c55e",fontSize:8,fontFamily:"'JetBrains Mono'",padding:"3px 8px",borderRadius:20,marginTop:4,display:"inline-block"},
  pnlCard:{margin:"0 12px 10px",background:"#0b0f1b",border:"1px solid",borderRadius:14,padding:"14px"},
  pnlRow:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12},
  micro:{fontSize:7,color:"#253347",fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:4},
  pnlBig:{fontSize:42,fontWeight:900,letterSpacing:"-3px",lineHeight:1},
  statRow:{display:"flex",background:"#0f1826",borderRadius:9,overflow:"hidden",marginBottom:10},
  sd:{width:1,background:"#182030"},
  dayBar:{height:6,background:"#182030",borderRadius:99,overflow:"hidden"},
  dayBarF:{height:"100%",borderRadius:99,transition:"width .8s ease"},
  advice:{margin:"0 12px 10px",display:"flex",alignItems:"center",gap:10,border:"1px solid",borderRadius:10,padding:"10px 12px",background:"#0b0f1b"},
  advTxt:{fontSize:11,fontWeight:700,lineHeight:1.4,flex:1},
  card:{margin:"0 12px 10px",background:"#0b0f1b",border:"1px solid #182030",borderRadius:12,padding:"12px 13px"},
  cLabel:{fontSize:7,color:"#253347",fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:9},
  mBar:{height:7,background:"#182030",borderRadius:99,overflow:"hidden"},
  mBarF:{height:"100%",borderRadius:99,transition:"width .6s ease"},
  nextCard:{margin:"0 12px 10px",border:"1px solid",borderRadius:12,padding:"13px",display:"flex",alignItems:"flex-start",gap:10,background:"#0b0f1b"},
  covBar:{height:5,background:"#182030",borderRadius:99,overflow:"hidden",marginTop:6},
  covFill:{height:"100%",borderRadius:99,transition:"width .5s"},
  editBtn:{background:"#182030",border:"1px solid #253347",color:"#60a5fa",fontSize:10,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontFamily:"'JetBrains Mono'"},
  empty:{textAlign:"center",color:"#1e2d40",fontSize:10,padding:"16px 0",fontFamily:"'JetBrains Mono'"},
  body:{padding:"12px 12px 80px"},
  monNav:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},
  monLbl:{fontSize:14,fontWeight:700,color:"#94a3b8"},
  mnBtn:{background:"#182030",border:"1px solid #253347",color:"#e2e8f0",width:34,height:34,borderRadius:8,fontSize:18,cursor:"pointer"},
  calGrid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:8},
  calWd:{fontSize:7,color:"#253347",textAlign:"center",padding:"3px 0",fontFamily:"'JetBrains Mono'"},
  calCell:{background:"#0b0f1b",border:"1px solid #182030",borderRadius:6,padding:"3px 2px",minHeight:52,cursor:"pointer"},
  calToday:{background:"#0c1628",border:"1px solid #1d4ed8"},
  calDN:{fontSize:10,fontWeight:700,marginBottom:1},
  calLeg:{display:"flex",gap:10,fontSize:8,justifyContent:"center",marginBottom:10,fontFamily:"'JetBrains Mono'"},
  dayRow:{background:"#0b0f1b",border:"1px solid #182030",borderRadius:10,padding:"10px 12px",marginBottom:8,display:"flex",gap:10,cursor:"pointer"},
  dayNum:{textAlign:"center",minWidth:32},
  pctBdg:{fontSize:8,fontFamily:"'JetBrains Mono'",fontWeight:700,border:"1px solid",borderRadius:20,padding:"2px 6px"},
  back:{background:"none",border:"none",color:"#60a5fa",fontSize:12,cursor:"pointer",fontFamily:"'Unbounded',sans-serif",fontWeight:700,padding:0},
  expItm:{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderTop:"1px solid #182030"},
  fl:{fontSize:8,color:"#475569",fontFamily:"'JetBrains Mono'",marginBottom:4,display:"flex",alignItems:"center",gap:4},
  inp:{width:"100%",background:"#182030",border:"1px solid #253347",borderRadius:7,padding:"9px 10px",color:"#e2e8f0",fontSize:14,fontFamily:"'JetBrains Mono'",outline:"none"},
  moodBtn:{flex:1,padding:"8px 4px",background:"#182030",border:"1px solid #253347",borderRadius:8,fontSize:18,cursor:"pointer"},
  moodOn:{background:"#1e2d40",border:"1px solid #3b82f6"},
  saveBtn:{width:"100%",padding:12,borderRadius:9,border:"none",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Unbounded',sans-serif",background:"linear-gradient(135deg,#16a34a,#15803d)"},
  catBtn:{padding:"5px 10px",background:"#182030",border:"1px solid #253347",borderRadius:20,color:"#475569",fontSize:9,cursor:"pointer",fontFamily:"'JetBrains Mono'"},
  catOn:{background:"#0f1826",color:"#e2e8f0"},
  delBtn2:{background:"none",border:"none",color:"#253347",cursor:"pointer",fontSize:12},
  payCard:{background:"#0b0f1b",border:"1px solid",borderRadius:12,padding:"13px",marginBottom:10},
  goalCard:{background:"#0b0f1b",border:"1px solid #182030",borderRadius:12,padding:"13px",marginBottom:10},
  addGoalBtn:{background:"linear-gradient(135deg,#1d4ed8,#2563eb)",border:"none",color:"#fff",fontSize:10,fontWeight:700,padding:"8px 14px",borderRadius:9,cursor:"pointer",fontFamily:"'Unbounded',sans-serif"},
  delGBtn:{background:"none",border:"none",color:"#253347",cursor:"pointer",fontSize:14,flexShrink:0},
  setCard:{background:"#0b0f1b",border:"1px solid #182030",borderRadius:11,padding:"11px 12px",marginBottom:9,display:"flex",gap:10},
  infoBox:{fontSize:9,color:"#253347",fontFamily:"'JetBrains Mono'",background:"#0b0f1b",border:"1px solid #182030",borderRadius:8,padding:"9px 11px",marginBottom:12,lineHeight:1.8},
  dot:{display:"inline-block",width:6,height:6,borderRadius:99,flexShrink:0},
};
