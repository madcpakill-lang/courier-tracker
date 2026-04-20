import { useState, useEffect } from "react";

const fz  = n => Number(n || 0).toFixed(2);
const fi  = n => Math.round(Number(n || 0));
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const p2  = n => String(n).padStart(2, "0");
const dk  = (y, m, d) => y + "-" + p2(m + 1) + "-" + p2(d);

const MRU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MGE = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const DOW = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];

const LS = {
  get: (k, d) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const K_BILLS = "kpl_b2";
const K_LOG   = (y, m) => "kpl_l_" + y + "_" + m;
const K_GOALS = "kpl_g2";

const weeklyCount = (dow, y, m) => {
  let n = 0;
  for (let d = 1; d <= dim(y, m); d++) if (new Date(y, m, d).getDay() === dow) n++;
  return n;
};

const billCost = (b, daysLeft, y, m) => {
  const amt = parseFloat(b.amount) || 0;
  if (!amt) return 0;
  if (b.freq === "weekly") return amt * weeklyCount(parseInt(b.dow) || 4, y, m);
  if (b.freq === "daily")  return amt * daysLeft;
  return amt;
};

const DEFAULT_BILLS = [
  { id: "rent",    label: "Аренда квартиры", icon: "🏠", freq: "monthly", day: 1,  dow: 4, amount: "" },
  { id: "scooter", label: "Аренда скутера",  icon: "🛵", freq: "weekly",  day: 1,  dow: 4, amount: "" },
  { id: "phone",   label: "Телефон",         icon: "📱", freq: "monthly", day: 15, dow: 4, amount: "" },
];

const EXP_CATS = [
  { id: "food",      label: "Еда",       icon: "🍲" },
  { id: "fuel",      label: "Топливо",   icon: "⛽" },
  { id: "smokes",    label: "Сигареты",  icon: "🚬" },
  { id: "transport", label: "Транспорт", icon: "🚌" },
  { id: "health",    label: "Здоровье",  icon: "💊" },
  { id: "other",     label: "Прочее",    icon: "📦" },
];

const ICONS = ["🏠","🛵","📱","🌐","💳","🍲","⛽","🚬","💊","📦","🎯","🚗","✈️","👕","🏋️","📚"];

export default function App() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const CY = now.getFullYear(), CM = now.getMonth(), CD = now.getDate();
  const HH = p2(now.getHours()), MM = p2(now.getMinutes());

  const [tab,  setTab]  = useState("today");
  const [vY,   setVY]   = useState(CY);
  const [vM,   setVM]   = useState(CM);

  const [bills, setBills] = useState(() => LS.get(K_BILLS, DEFAULT_BILLS));
  const [goals, setGoals] = useState(() => LS.get(K_GOALS, []));
  const [log,   setLog]   = useState(() => LS.get(K_LOG(CY, CM), {}));

  useEffect(() => { setLog(LS.get(K_LOG(vY, vM), {})); }, [vY, vM]);

  const [showInc, setShowInc] = useState(false);
  const [showExp, setShowExp] = useState(false);
  const [dayModal, setDayModal] = useState(null);
  const [iW, setIW] = useState(""); const [iB, setIB] = useState(""); const [iN, setIN] = useState("");
  const [eCat, setECat] = useState("food"); const [eAmt, setEAmt] = useState(""); const [eLbl, setELbl] = useState("");

  const isCur  = vY === CY && vM === CM;
  const todKey = dk(CY, CM, CD);
  const totDays = dim(vY, vM);
  const daysLeft = isCur ? Math.max(1, totDays - CD + 1) : totDays;

  const totalBills = bills.reduce((s, b) => s + billCost(b, daysLeft, vY, vM), 0);
  const dailyTarget = totalBills > 0 ? totalBills / daysLeft : 0;

  const allEntries = Object.values(log).flat();
  const incEntries = allEntries.filter(e => e.type === "income");
  const expEntries = allEntries.filter(e => e.type === "expense");
  const mWolt = incEntries.reduce((s, e) => s + (parseFloat(e.wolt) || 0), 0);
  const mBolt = incEntries.reduce((s, e) => s + (parseFloat(e.bolt) || 0), 0);
  const mInc  = mWolt + mBolt;
  const mExp  = expEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const received = Object.entries(log).reduce((s, [key, ents]) => {
    if (!isCur || key < todKey) {
      return s + ents.filter(e => e.type === "income")
        .reduce((ss, e) => ss + (parseFloat(e.wolt) || 0) + (parseFloat(e.bolt) || 0), 0);
    }
    return s;
  }, 0);

  const netMonth  = mInc - totalBills - mExp;
  const mPct      = totalBills > 0 ? Math.round((mInc / totalBills) * 100) : 0;
  const needPerDay = daysLeft > 0 ? Math.max(0, totalBills - mInc) / daysLeft : 0;

  const todEnts = log[todKey] || [];
  const todW   = todEnts.filter(e => e.type === "income").reduce((s, e) => s + (parseFloat(e.wolt) || 0), 0);
  const todB   = todEnts.filter(e => e.type === "income").reduce((s, e) => s + (parseFloat(e.bolt) || 0), 0);
  const todInc = todW + todB;
  const todExp = todEnts.filter(e => e.type === "expense").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const todNet = todInc - todExp;
  const pnl    = dailyTarget > 0 ? Math.round(((todInc - dailyTarget) / dailyTarget) * 100) : (todInc > 0 ? 100 : -100);

  const yest = new Date(CY, CM, CD - 1);
  const yKey = dk(yest.getFullYear(), yest.getMonth(), yest.getDate());
  const arrived = (LS.get(K_LOG(yest.getFullYear(), yest.getMonth()), {})[yKey] || [])
    .filter(e => e.type === "income")
    .reduce((s, e) => s + (parseFloat(e.wolt) || 0) + (parseFloat(e.bolt) || 0), 0);

  const upcoming = [];
  for (let off = 0; off <= 30; off++) {
    const dt = new Date(CY, CM, CD + off);
    bills.forEach(b => {
      if (!parseFloat(b.amount)) return;
      if (b.freq === "daily") return;
      const fires = b.freq === "weekly"
        ? dt.getDay() === parseInt(b.dow || 4)
        : dt.getDate() === parseInt(b.day || 1);
      if (fires) upcoming.push({ ...b, daysAway: off, dt, amt: parseFloat(b.amount) });
    });
  }
  const nextBill = upcoming[0] || null;

  function saveLog(nl) { setLog(nl); LS.set(K_LOG(vY, vM), nl); }
  function addIncome() {
    const w = parseFloat(iW) || 0, b = parseFloat(iB) || 0;
    if (!w && !b) return;
    const e = { id: Date.now(), type: "income", wolt: w, bolt: b, note: iN, ts: new Date().toISOString() };
    saveLog({ ...log, [todKey]: [...(log[todKey] || []), e] });
    setIW(""); setIB(""); setIN(""); setShowInc(false);
  }
  function addExpense() {
    const amt = parseFloat(eAmt); if (!amt) return;
    const cat = EXP_CATS.find(c => c.id === eCat);
    const e = { id: Date.now(), type: "expense", cat: eCat, label: eLbl || cat?.label || "Расход", amount: amt, ts: new Date().toISOString() };
    saveLog({ ...log, [todKey]: [...(log[todKey] || []), e] });
    setEAmt(""); setELbl(""); setShowExp(false);
  }
  function delEntry(key, id) { saveLog({ ...log, [key]: (log[key] || []).filter(e => e.id !== id) }); }
  function saveBills(n) { setBills(n); LS.set(K_BILLS, n); }
  function updBill(id, f, v) { saveBills(bills.map(b => b.id === id ? { ...b, [f]: v } : b)); }
  function addBill() { saveBills([...bills, { id: "b" + Date.now(), label: "Новый платёж", icon: "💳", freq: "monthly", day: 1, dow: 4, amount: "" }]); }
  function delBill(id) { saveBills(bills.filter(b => b.id !== id)); }
  function saveGoals(n) { setGoals(n); LS.set(K_GOALS, n); }
  function addGoal() { saveGoals([...goals, { id: "g" + Date.now(), label: "", target: "", saved: "", deadline: "" }]); }
  function updGoal(id, f, v) { saveGoals(goals.map(g => g.id === id ? { ...g, [f]: v } : g)); }
  function delGoal(id) { saveGoals(goals.filter(g => g.id !== id)); }
  function prevMon() { if (vM === 0) { setVY(y => y - 1); setVM(11); } else setVM(m => m - 1); }
  function nextMon() { if (vM === 11) { setVY(y => y + 1); setVM(0); } else setVM(m => m + 1); }

  const pnlC = pnl >= 0 ? "#22c55e" : pnl >= -30 ? "#fbbf24" : "#f97316";
  const firstDow = (new Date(vY, vM, 1).getDay() + 6) % 7;
  const calCells = Array(firstDow).fill(null).concat(Array.from({ length: totDays }, (_, i) => i + 1));

  function getAdvice() {
    if (nextBill && nextBill.daysAway === 0 && received < nextBill.amt)
      return { emoji: "🚨", text: "Сегодня платёж " + nextBill.label + " — нужно " + fz(nextBill.amt - received) + " zł", color: "#ef4444" };
    if (nextBill && nextBill.daysAway <= 3 && received < nextBill.amt)
      return { emoji: "⚡", text: "Через " + nextBill.daysAway + " дн платёж " + nextBill.label + " " + fz(nextBill.amt) + " zł", color: "#f97316" };
    if (pnl >= 50)  return { emoji: "🔥", text: "P&L +" + pnl + "% — отличный день!", color: "#22c55e" };
    if (pnl >= 0)   return { emoji: "✅", text: "Вышел в ноль! Каждый заказ — чистая прибыль", color: "#22c55e" };
    if (pnl >= -30) return { emoji: "💪", text: "Почти ноль — осталось " + fz(dailyTarget - todInc) + " zł", color: "#fbbf24" };
    if (todInc > 0) return { emoji: "🎯", text: "P&L " + pnl + "% — продолжай работать", color: "#f97316" };
    return { emoji: "🛵", text: "Цель дня " + fz(dailyTarget) + " zł — начни смену", color: "#475569" };
  }
  const adv = getAdvice();

  return (
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
      <style>{"* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; } @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.15} } body { background:#060911; }"}</style>

      <div style={S.nav}>
        {[["today","⚡"],["calendar","📅"],["month","📊"],["payments","💳"],["goals","🎯"],["settings","⚙️"]].map(([id, ic]) => (
          <button key={id} style={{ ...S.navBtn, ...(tab === id ? S.navOn : {}) }}
            onClick={() => { setTab(id); setShowInc(false); setShowExp(false); }}>{ic}</button>
        ))}
      </div>

      {tab === "today" && (
        <div style={S.page}>
          <div style={S.hdr}>
            <div>
              <div style={S.clock}>{HH}<span style={{ animation: "blink 2s infinite" }}>:</span>{MM}</div>
              <div style={S.sub}>{DOW[now.getDay()]} · {CD} {MGE[CM]} {CY}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={S.logo}>🛵 КурьерP&L</div>
              {arrived > 0 && <div style={S.badge}>+{fz(arrived)} zł пришло</div>}
            </div>
          </div>

          <div style={{ ...S.card, borderColor: pnlC + "55", marginBottom: 10 }}>
            <div style={S.micro}>P&L СЕГОДНЯ · {HH}:{MM}</div>
            <div style={{ ...S.pnlBig, color: pnlC }}>
              {pnl >= 0 ? "+" + pnl + "%" : pnl + "%"}
            </div>
            <div style={{ fontSize: 10, color: pnlC, fontFamily: "'JetBrains Mono'", marginBottom: 12 }}>
              {pnl >= 0
                ? "+" + fz(todInc - dailyTarget) + " zł сверх цели 🔥"
                : todInc > 0
                  ? "ещё " + fz(dailyTarget - todInc) + " zł до нуля"
                  : "цель дня " + fz(dailyTarget) + " zł"}
            </div>
            <div style={S.row4}>
              <Stat l="Wolt"   v={fz(todW)}   c="#00c2e0"/>
              <div style={S.sdiv}/>
              <Stat l="Bolt"   v={fz(todB)}   c="#34d45a"/>
              <div style={S.sdiv}/>
              <Stat l="Расход" v={fz(todExp)} c="#ef4444"/>
              <div style={S.sdiv}/>
              <Stat l="Нетто"  v={(todNet >= 0 ? "+" : "") + fz(todNet)} c={todNet >= 0 ? "#22c55e" : "#f97316"}/>
            </div>
            <div style={{ position: "relative" }}>
              <div style={S.barTrack}>
                <div style={{ ...S.barFill, width: Math.min(Math.max((pnl + 100) / 2, 0), 100) + "%", background: pnlC }}/>
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "#334155" }}/>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#334155", fontFamily: "'JetBrains Mono'", marginTop: 4 }}>
                <span>−100%</span>
                <span style={{ color: "#475569" }}>0 = цель {fz(dailyTarget)} zł</span>
                <span style={{ color: "#22c55e" }}>+%</span>
              </div>
            </div>
          </div>

          <div style={{ ...S.card, borderColor: adv.color + "44", marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{adv.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: adv.color, lineHeight: 1.4 }}>{adv.text}</span>
          </div>

          <div style={{ ...S.card, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={S.micro}>МЕСЯЦ · {MRU[CM]}</div>
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-1px", color: mPct >= 100 ? "#22c55e" : mPct >= 60 ? "#fbbf24" : "#f97316" }}>{mPct}%</div>
                {todInc > 0 && <div style={{ fontSize: 8, color: "#253347", fontFamily: "'JetBrains Mono'", marginTop: 2 }}>{"⏳ +" + fz(todInc) + " zł придёт завтра"}</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: netMonth >= 0 ? "#22c55e" : "#f97316", fontFamily: "'JetBrains Mono'" }}>{(netMonth >= 0 ? "+" : "") + fz(netMonth) + " zł"}</div>
                <div style={{ fontSize: 8, color: "#334155", fontFamily: "'JetBrains Mono'" }}>нетто месяца</div>
                <div style={{ fontSize: 8, color: "#fbbf24", fontFamily: "'JetBrains Mono'", marginTop: 2 }}>{fz(needPerDay) + " zł/день нужно"}</div>
              </div>
            </div>
            <div style={S.barTrack}>
              <div style={{ ...S.barFill, width: Math.min(mPct, 100) + "%", background: mPct >= 100 ? "linear-gradient(90deg,#16a34a,#22c55e)" : mPct >= 60 ? "linear-gradient(90deg,#d97706,#fbbf24)" : "linear-gradient(90deg,#be123c,#f43f5e)" }}/>
            </div>
          </div>

          {nextBill && (
            <div style={{ ...S.card, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, borderColor: nextBill.daysAway === 0 ? "#ef444466" : nextBill.daysAway <= 3 ? "#f9731666" : "#182030" }}>
              <div style={{ fontSize: 26 }}>{nextBill.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={S.micro}>БЛИЖАЙШИЙ ПЛАТЁЖ</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{nextBill.label}</div>
                <div style={{ fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono'" }}>
                  {nextBill.freq === "weekly" ? "Каждый " + DOW[parseInt(nextBill.dow || 4)] : (nextBill.day + "-го числа")} · {nextBill.dt.getDate() + " " + MGE[nextBill.dt.getMonth()]}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 17, fontWeight: 900, fontFamily: "'JetBrains Mono'" }}>{fz(nextBill.amt)} zł</div>
                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: nextBill.daysAway === 0 ? "#ef4444" : nextBill.daysAway <= 3 ? "#f97316" : "#22c55e" }}>
                  {nextBill.daysAway === 0 ? "⚠️ СЕГОДНЯ" : nextBill.daysAway === 1 ? "ЗАВТРА" : "через " + nextBill.daysAway + " дн"}
                </div>
              </div>
            </div>
          )}

          {todEnts.length > 0 && (
            <div style={{ ...S.card, marginBottom: 10 }}>
              <div style={S.micro}>ЗАПИСИ СЕГОДНЯ</div>
              {todEnts.map(e => <EntRow key={e.id} e={e} onDel={() => delEntry(todKey, e.id)}/>)}
            </div>
          )}

          <div style={{ height: 90 }}/>

          {showInc && (
            <div style={S.panel}>
              <div style={S.panelH}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>💰 Добавить доход</div>
                <button style={S.xBtn} onClick={() => setShowInc(false)}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={S.lbl}>🔵 Wolt (zł)</div>
                  <input style={S.inp} type="text" inputMode="decimal" placeholder="0.00" value={iW} onChange={e => setIW(e.target.value.replace(/[^0-9.]/g, ""))} autoFocus/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={S.lbl}>🟢 Bolt (zł)</div>
                  <input style={S.inp} type="text" inputMode="decimal" placeholder="0.00" value={iB} onChange={e => setIB(e.target.value.replace(/[^0-9.]/g, ""))}/>
                </div>
              </div>
              <input style={{ ...S.inp, marginBottom: 8 }} type="text" placeholder="Заметка (необязательно)" value={iN} onChange={e => setIN(e.target.value)}/>
              <div style={{ fontSize: 8, color: "#334155", fontFamily: "'JetBrains Mono'", marginBottom: 10 }}>⏳ T+1: деньги придут завтра</div>
              <button style={{ ...S.btn, background: "linear-gradient(135deg,#16a34a,#15803d)" }} onClick={addIncome}>✓ Записать доход</button>
            </div>
          )}

          {showExp && (
            <div style={S.panel}>
              <div style={S.panelH}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f97316" }}>💸 Добавить расход</div>
                <button style={S.xBtn} onClick={() => setShowExp(false)}>✕</button>
              </div>
              <div style={S.lbl}>Категория</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {EXP_CATS.map(c => (
                  <button key={c.id} onClick={() => setECat(c.id)}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid", fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono'",
                      background: eCat === c.id ? "#182030" : "#0b0f1b",
                      borderColor: eCat === c.id ? "#f97316" : "#253347",
                      color: eCat === c.id ? "#e2e8f0" : "#475569" }}>
                    {c.icon + " " + c.label}
                  </button>
                ))}
              </div>
              <div style={S.lbl}>Описание (необязательно)</div>
              <input style={{ ...S.inp, marginBottom: 10 }} type="text" placeholder="Что именно…" value={eLbl} onChange={e => setELbl(e.target.value)}/>
              <div style={S.lbl}>Сумма (zł)</div>
              <input style={{ ...S.inp, marginBottom: 12 }} type="text" inputMode="decimal" placeholder="0.00" value={eAmt} onChange={e => setEAmt(e.target.value.replace(/[^0-9.]/g, ""))}/>
              <button style={{ ...S.btn, background: "linear-gradient(135deg,#b45309,#d97706)" }} onClick={addExpense}>✓ Записать расход</button>
            </div>
          )}

          {!showInc && !showExp && (
            <div style={S.fabRow}>
              <button style={{ ...S.fab, background: "linear-gradient(135deg,#16a34a,#15803d)", flex: 1 }} onClick={() => setShowInc(true)}>＋ Доход</button>
              <button style={{ ...S.fab, background: "linear-gradient(135deg,#b45309,#d97706)", flex: 1 }} onClick={() => setShowExp(true)}>＋ Расход</button>
            </div>
          )}
        </div>
      )}

      {tab === "calendar" && (
        <div style={S.page}>
          <MonNav y={vY} m={vM} onP={prevMon} onN={nextMon}/>
          <div style={S.calGrid}>
            {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(w => <div key={w} style={S.calWd}>{w}</div>)}
            {calCells.map((d, i) => {
              if (!d) return <div key={"e" + i}/>;
              const key = dk(vY, vM, d);
              const ents = log[key] || [];
              const inc = ents.filter(e => e.type === "income").reduce((s, e) => s + (parseFloat(e.wolt) || 0) + (parseFloat(e.bolt) || 0), 0);
              const exp = ents.filter(e => e.type === "expense").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
              const isT = isCur && d === CD;
              const isF = isCur && d > CD;
              const dpnl = dailyTarget > 0 ? Math.round(((inc - dailyTarget) / dailyTarget) * 100) : (inc > 0 ? 100 : -100);
              return (
                <div key={d} style={{ ...S.calCell, ...(isT ? S.calT : {}), ...(isF ? { opacity: 0.3 } : {}), ...(inc > 0 ? { borderColor: dpnl >= 0 ? "#16a34a55" : "#ef444433" } : {}) }}
                  onClick={() => !isF && setDayModal(key)}>
                  <div style={{ ...S.calDN, color: isT ? "#60a5fa" : inc > 0 ? "#e2e8f0" : "#334155" }}>{d}</div>
                  {inc > 0 && <div style={{ fontSize: 7, color: "#22c55e", fontFamily: "'JetBrains Mono'" }}>{"+" + fi(inc)}</div>}
                  {exp > 0 && <div style={{ fontSize: 7, color: "#f97316", fontFamily: "'JetBrains Mono'" }}>{"−" + fi(exp)}</div>}
                  {inc > 0 && <div style={{ fontSize: 7, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: dpnl >= 0 ? "#22c55e" : "#f97316" }}>{(dpnl >= 0 ? "+" : "") + dpnl + "%"}</div>}
                </div>
              );
            })}
          </div>
          {Object.keys(log).filter(key => {
            const p = key.split("-");
            return parseInt(p[0]) === vY && parseInt(p[1]) === vM + 1;
          }).sort((a, b) => b.localeCompare(a)).map(key => {
            const ents = log[key] || [];
            const inc = ents.filter(e => e.type === "income").reduce((s, e) => s + (parseFloat(e.wolt) || 0) + (parseFloat(e.bolt) || 0), 0);
            const exp = ents.filter(e => e.type === "expense").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
            if (!inc && !exp) return null;
            const d = parseInt(key.split("-")[2]);
            const dpnl = dailyTarget > 0 ? Math.round(((inc - dailyTarget) / dailyTarget) * 100) : 0;
            return (
              <div key={key} style={S.dayRow} onClick={() => setDayModal(key)}>
                <div style={S.dayNum}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#94a3b8", lineHeight: 1 }}>{d}</div>
                  <div style={{ fontSize: 8, color: "#334155", fontFamily: "'JetBrains Mono'" }}>{DOW[new Date(key + "T12:00").getDay()]}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", fontFamily: "'JetBrains Mono'" }}>{fz(inc) + " zł"}</span>
                    <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono'", fontWeight: 700, border: "1px solid", borderRadius: 20, padding: "2px 7px", color: dpnl >= 0 ? "#22c55e" : dpnl >= -30 ? "#fbbf24" : "#f97316", borderColor: dpnl >= 0 ? "#16a34a33" : "#f9731633" }}>
                      {(dpnl >= 0 ? "+" : "") + dpnl + "%"}
                    </span>
                  </div>
                  {exp > 0 && <div style={{ fontSize: 9, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>{"расход: " + fz(exp) + " zł · нетто: " + (inc - exp >= 0 ? "+" : "") + fz(inc - exp)}</div>}
                </div>
              </div>
            );
          })}
          <div style={{ height: 20 }}/>
        </div>
      )}

      {tab === "month" && (
        <div style={S.page}>
          <MonNav y={vY} m={vM} onP={prevMon} onN={nextMon}/>
          <div style={{ ...S.card, marginBottom: 10 }}>
            <div style={S.micro}>ИТОГИ МЕСЯЦА</div>
            {[
              ["Заработано",     fz(mInc) + " zł",                            "#22c55e"],
              ["Получено (T+1)", fz(received) + " zł",                        "#60a5fa"],
              ["Расходы",        fz(mExp) + " zł",                            "#ef4444"],
              ["Платежи",        fz(totalBills) + " zł",                      "#ef4444"],
              ["Нетто",          (netMonth >= 0 ? "+" : "") + fz(netMonth) + " zł", netMonth >= 0 ? "#22c55e" : "#f97316"],
              ["Wolt",           fz(mWolt) + " zł",                           "#00c2e0"],
              ["Bolt",           fz(mBolt) + " zł",                           "#34d45a"],
              ["Дней осталось",  String(daysLeft),                            "#94a3b8"],
              ["Цель в день",    fz(dailyTarget) + " zł",                     "#fbbf24"],
              ["Нужно/день",     fz(needPerDay) + " zł",                      needPerDay > dailyTarget * 1.3 ? "#ef4444" : "#fbbf24"],
              ["Выполнение",     mPct + "%",                                  mPct >= 100 ? "#22c55e" : "#f97316"],
            ].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #182030", fontSize: 11 }}>
                <span style={{ color: "#475569" }}>{l}</span>
                <span style={{ color: c, fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          {mExp > 0 && (
            <div style={{ ...S.card, marginBottom: 10 }}>
              <div style={S.micro}>РАСХОДЫ ПО КАТЕГОРИЯМ</div>
              {EXP_CATS.map(cat => {
                const amt = expEntries.filter(e => e.cat === cat.id).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
                if (!amt) return null;
                const p = mExp > 0 ? Math.round((amt / mExp) * 100) : 0;
                return (
                  <div key={cat.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                      <span>{cat.icon + " " + cat.label}</span>
                      <span style={{ fontFamily: "'JetBrains Mono'" }}>{fz(amt) + " zł · " + p + "%"}</span>
                    </div>
                    <div style={{ height: 5, background: "#182030", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: p + "%", background: "#f97316", borderRadius: 99 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "payments" && (
        <div style={S.page}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>💳 Платежи</div>
          <div style={{ fontSize: 9, color: "#334155", fontFamily: "'JetBrains Mono'", marginBottom: 12, lineHeight: 1.7 }}>
            Только фиксированные платежи. Еда/сигареты/топливо — через ＋ Расход.
          </div>
          <div style={{ ...S.card, marginBottom: 10 }}>
            {[
              ["Итого в месяц",    fz(totalBills) + " zł", "#ef4444"],
              ["Получено",         fz(received) + " zł",   "#22c55e"],
              ["Осталось собрать", fz(Math.max(totalBills - received, 0)) + " zł", "#fbbf24"],
              ["Цель в день",      fz(dailyTarget) + " zł", "#fbbf24"],
            ].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #182030", fontSize: 11 }}>
                <span style={{ color: "#475569" }}>{l}</span>
                <span style={{ color: c, fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          {bills.filter(b => parseFloat(b.amount) > 0 && b.freq !== "daily").map(b => {
            const cost = billCost(b, daysLeft, CY, CM);
            const covPct = cost > 0 ? Math.min(Math.round((received / cost) * 100), 100) : 0;
            const nb = upcoming.find(u => u.id === b.id);
            return (
              <div key={b.id} style={{ ...S.card, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{b.icon + " " + b.label}</div>
                    <div style={{ fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono'", marginTop: 2 }}>
                      {b.freq === "weekly" ? "Каждый " + DOW[parseInt(b.dow) || 4] + " · " + weeklyCount(parseInt(b.dow) || 4, CY, CM) + "× в мес" : (b.day + "-го числа")}
                    </div>
                    {nb && <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono'", marginTop: 2, color: nb.daysAway === 0 ? "#ef4444" : nb.daysAway <= 3 ? "#f97316" : "#22c55e" }}>
                      {nb.daysAway === 0 ? "⚠️ СЕГОДНЯ" : nb.daysAway === 1 ? "ЗАВТРА" : "через " + nb.daysAway + " дн"}
                    </div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "'JetBrains Mono'" }}>{fz(parseFloat(b.amount)) + " zł"}</div>
                    {b.freq !== "monthly" && <div style={{ fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono'" }}>{"итого " + fz(cost) + " zł/мес"}</div>}
                  </div>
                </div>
                <div style={{ height: 6, background: "#182030", borderRadius: 99, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", width: covPct + "%", background: covPct >= 100 ? "#22c55e" : "#f97316", borderRadius: 99 }}/>
                </div>
                <div style={{ fontSize: 8, color: "#334155", fontFamily: "'JetBrains Mono'" }}>
                  {"покрыто " + fz(Math.min(received, cost)) + " / " + fz(cost) + " zł (" + covPct + "%)"}
                </div>
              </div>
            );
          })}
          {bills.filter(b => parseFloat(b.amount) > 0 && b.freq !== "daily").length === 0 && (
            <div style={S.empty}>Добавь платежи в ⚙️</div>
          )}
        </div>
      )}

      {tab === "goals" && (
        <div style={S.page}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>🎯 Мои цели</div>
            <button style={S.addBtn} onClick={addGoal}>＋ Добавить</button>
          </div>
          {goals.length === 0 && <div style={S.empty}>Нажми «Добавить» чтобы создать цель</div>}
          {goals.map(g => {
            const need = parseFloat(g.target) || 0;
            const saved = parseFloat(g.saved) || 0;
            const p = need > 0 ? Math.min(Math.round((saved / need) * 100), 100) : 0;
            return (
              <div key={g.id} style={{ ...S.card, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input style={{ ...S.inp, flex: 1, fontSize: 13, fontWeight: 700 }} placeholder="На что коплю…" value={g.label} onChange={e => updGoal(g.id, "label", e.target.value)}/>
                  <button style={{ ...S.xBtn, fontSize: 16 }} onClick={() => delGoal(g.id)}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={S.lbl}>Нужно (zł)</div>
                    <input style={S.inp} type="text" inputMode="decimal" placeholder="0" value={g.target} onChange={e => updGoal(g.id, "target", e.target.value.replace(/[^0-9.]/g, ""))}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={S.lbl}>Накоплено (zł)</div>
                    <input style={S.inp} type="text" inputMode="decimal" placeholder="0" value={g.saved} onChange={e => updGoal(g.id, "saved", e.target.value.replace(/[^0-9.]/g, ""))}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={S.lbl}>Дедлайн</div>
                    <input style={{ ...S.inp, fontSize: 11, padding: "8px 6px" }} type="date" value={g.deadline} onChange={e => updGoal(g.id, "deadline", e.target.value)}/>
                  </div>
                </div>
                {need > 0 && (
                  <div>
                    <div style={{ height: 8, background: "#182030", borderRadius: 99, overflow: "hidden", marginBottom: 5 }}>
                      <div style={{ height: "100%", width: p + "%", borderRadius: 99, transition: "width .5s", background: p >= 100 ? "linear-gradient(90deg,#16a34a,#22c55e)" : "linear-gradient(90deg,#1d4ed8,#60a5fa)" }}/>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: "'JetBrains Mono'" }}>
                      <span style={{ color: p >= 100 ? "#22c55e" : "#60a5fa" }}>{p + "% · " + fz(saved) + " zł"}</span>
                      {p < 100 ? <span style={{ color: "#334155" }}>{"осталось " + fz(need - saved) + " zł"}</span> : <span style={{ color: "#22c55e" }}>✅ Достигнуто!</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "settings" && (
        <div style={S.page}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>⚙️ Платежи</div>
            <button style={S.addBtn} onClick={addBill}>＋ Добавить</button>
          </div>
          <div style={S.infoBox}>
            <div>{"📌 Только ФИКСИРОВАННЫЕ платежи: аренда, скутер, телефон"}</div>
            <div>{"🏠 Аренда → В мес. → число 1"}</div>
            <div>{"🛵 Скутер → Еженед. → день Чт"}</div>
            <div style={{ color: "#f97316" }}>{"⚠️ Еда/сигареты/топливо — вноси через Расход каждый день"}</div>
          </div>
          {bills.map(b => (
            <div key={b.id} style={{ ...S.card, marginBottom: 10, gap: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={b.icon} onChange={e => updBill(b.id, "icon", e.target.value)}
                  style={{ ...S.inp, width: 52, padding: "8px 4px", fontSize: 20, textAlign: "center", flexShrink: 0 }}>
                  {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                <input style={{ ...S.inp, flex: 1, fontSize: 13, fontWeight: 700 }} type="text" placeholder="Название" value={b.label} onChange={e => updBill(b.id, "label", e.target.value)}/>
                <button style={{ ...S.xBtn, fontSize: 18, padding: "0 6px" }} onClick={() => delBill(b.id)}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={S.lbl}>Сумма (zł)</div>
                  <input style={{ ...S.inp, fontSize: 16, fontWeight: 700 }} type="text" inputMode="decimal" placeholder="0.00" value={b.amount} onChange={e => updBill(b.id, "amount", e.target.value.replace(/[^0-9.]/g, ""))}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={S.lbl}>Частота</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[["monthly","В мес."],["weekly","Еженед."]].map(([fr, lbl]) => (
                      <button key={fr} onClick={() => updBill(b.id, "freq", fr)}
                        style={{ flex: 1, padding: "9px 2px", borderRadius: 7, border: "1px solid", fontSize: 8, cursor: "pointer", fontFamily: "'Unbounded',sans-serif", fontWeight: 700,
                          background: b.freq === fr ? "#1e3a5f" : "#0b0f1b",
                          borderColor: b.freq === fr ? "#3b82f6" : "#253347",
                          color: b.freq === fr ? "#e2e8f0" : "#475569" }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {b.freq === "monthly" ? (
                <div>
                  <div style={S.lbl}>Число месяца</div>
                  <input style={{ ...S.inp, width: 110 }} type="text" inputMode="numeric" placeholder="1–31"
                    value={b.day === undefined ? "" : String(b.day)}
                    onChange={e => updBill(b.id, "day", e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={e => { const n = parseInt(e.target.value); updBill(b.id, "day", !n || n < 1 ? 1 : n > 31 ? 31 : n); }}/>
                </div>
              ) : (
                <div>
                  <div style={S.lbl}>День недели</div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {DOW.map((d, i) => (
                      <button key={i} onClick={() => updBill(b.id, "dow", i)}
                        style={{ flex: 1, padding: "8px 2px", borderRadius: 7, border: "1px solid", fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono'",
                          background: parseInt(b.dow) === i ? "#1e3a5f" : "#0b0f1b",
                          borderColor: parseInt(b.dow) === i ? "#3b82f6" : "#253347",
                          color: parseInt(b.dow) === i ? "#e2e8f0" : "#475569" }}>
                        {d}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono'", marginTop: 5 }}>
                    {"В " + MRU[vM] + ": " + weeklyCount(parseInt(b.dow) || 4, vY, vM) + "× · итого " + fz(billCost(b, daysLeft, vY, vM)) + " zł"}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div style={{ ...S.card, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #182030", fontSize: 12 }}>
              <span style={{ color: "#475569" }}>Итого расходов</span>
              <span style={{ color: "#ef4444", fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>{fz(totalBills) + " zł / мес"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12 }}>
              <span style={{ color: "#475569" }}>Минимум в день</span>
              <span style={{ color: "#fbbf24", fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>{fz(dailyTarget) + " zł"}</span>
            </div>
          </div>
          <div style={S.infoBox}>
            {"T+1: Wolt и Bolt переводят деньги на следующий день. Баланс считается только из полученных денег."}
          </div>
        </div>
      )}

      {dayModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setDayModal(null); }}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 900 }}>
                {parseInt(dayModal.split("-")[2]) + " " + MGE[parseInt(dayModal.split("-")[1]) - 1] + " " + dayModal.split("-")[0]}
              </div>
              <button style={S.xBtn} onClick={() => setDayModal(null)}>✕</button>
            </div>
            {(log[dayModal] || []).length === 0
              ? <div style={S.empty}>Нет записей за этот день</div>
              : (log[dayModal] || []).map(e => <EntRow key={e.id} e={e} onDel={() => delEntry(dayModal, e.id)}/>)
            }
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ l, v, c }) {
  return (
    <div style={{ flex: 1, padding: "8px 4px", textAlign: "center" }}>
      <div style={{ fontSize: 7, color: "#253347", fontFamily: "'JetBrains Mono'", marginBottom: 3 }}>{l}</div>
      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: c }}>{v}</div>
    </div>
  );
}

function MonNav({ y, m, onP, onN }) {
  const MRU2 = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <button style={S.mnBtn} onClick={onP}>{"‹"}</button>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>{MRU2[m] + " " + y}</span>
      <button style={S.mnBtn} onClick={onN}>{"›"}</button>
    </div>
  );
}

function EntRow({ e, onDel }) {
  const fz2 = n => Number(n || 0).toFixed(2);
  const cats = [{ id:"food",icon:"🍲"},{id:"fuel",icon:"⛽"},{id:"smokes",icon:"🚬"},{id:"transport",icon:"🚌"},{id:"health",icon:"💊"},{id:"other",icon:"📦"}];
  const isInc = e.type === "income";
  const total = isInc ? (parseFloat(e.wolt) || 0) + (parseFloat(e.bolt) || 0) : parseFloat(e.amount) || 0;
  const time  = new Date(e.ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #182030" }}>
      <span style={{ fontSize: 8, color: "#253347", fontFamily: "'JetBrains Mono'", minWidth: 32 }}>{time}</span>
      <div style={{ flex: 1 }}>
        {isInc ? (
          <span style={{ fontSize: 11 }}>
            {parseFloat(e.wolt) > 0 && <span style={{ color: "#00c2e0", marginRight: 8 }}>{"W " + fz2(parseFloat(e.wolt))}</span>}
            {parseFloat(e.bolt) > 0 && <span style={{ color: "#34d45a" }}>{"B " + fz2(parseFloat(e.bolt))}</span>}
            {e.note && <span style={{ color: "#475569", fontSize: 9, marginLeft: 6 }}>{e.note}</span>}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: "#ef4444" }}>
            {(cats.find(c => c.id === e.cat)?.icon || "📦") + " " + e.label}
          </span>
        )}
      </div>
      <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 700, color: isInc ? "#22c55e" : "#ef4444" }}>
        {(isInc ? "+" : "−") + fz2(total)}
      </span>
      <button onClick={onDel} style={{ background: "none", border: "none", color: "#253347", cursor: "pointer", fontSize: 12 }}>✕</button>
    </div>
  );
}

const S = {
  root:    { fontFamily: "'Unbounded',sans-serif", background: "#060911", minHeight: "100vh", color: "#e2e8f0", maxWidth: 480, margin: "0 auto" },
  nav:     { display: "flex", background: "#0b0f1b", borderBottom: "1px solid #182030", position: "sticky", top: 0, zIndex: 50 },
  navBtn:  { flex: 1, padding: "12px 4px", background: "none", border: "none", borderBottom: "2px solid transparent", color: "#253347", fontSize: 18, cursor: "pointer" },
  navOn:   { color: "#e2e8f0", borderBottom: "2px solid #3b82f6" },
  page:    { padding: "12px 13px 100px" },
  hdr:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  clock:   { fontSize: 30, fontWeight: 900, fontFamily: "'JetBrains Mono'", letterSpacing: -2, lineHeight: 1 },
  sub:     { fontSize: 9, color: "#334155", fontFamily: "'JetBrains Mono'", marginTop: 2 },
  logo:    { fontSize: 13, fontWeight: 900 },
  badge:   { background: "#052e16", border: "1px solid #16a34a44", color: "#22c55e", fontSize: 8, fontFamily: "'JetBrains Mono'", padding: "3px 8px", borderRadius: 20, marginTop: 4, display: "inline-block" },
  card:    { background: "#0b0f1b", border: "1px solid #182030", borderRadius: 12, padding: "12px 13px", display: "flex", flexDirection: "column" },
  micro:   { fontSize: 7, color: "#253347", fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 6 },
  pnlBig:  { fontSize: 42, fontWeight: 900, letterSpacing: "-3px", lineHeight: 1 },
  row4:    { display: "flex", background: "#0f1826", borderRadius: 9, overflow: "hidden", marginBottom: 10 },
  sdiv:    { width: 1, background: "#182030" },
  barTrack:{ height: 7, background: "#182030", borderRadius: 99, overflow: "hidden", position: "relative" },
  barFill: { height: "100%", borderRadius: 99, transition: "width .6s ease", position: "absolute", top: 0, left: 0 },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 10 },
  calWd:   { fontSize: 7, color: "#253347", textAlign: "center", padding: "3px 0", fontFamily: "'JetBrains Mono'" },
  calCell: { background: "#0b0f1b", border: "1px solid #182030", borderRadius: 6, padding: "3px 2px", minHeight: 52, cursor: "pointer" },
  calT:    { background: "#0c1628", border: "1px solid #1d4ed8" },
  calDN:   { fontSize: 10, fontWeight: 700, marginBottom: 1, textAlign: "center" },
  dayRow:  { background: "#0b0f1b", border: "1px solid #182030", borderRadius: 10, padding: "10px 12px", marginBottom: 8, display: "flex", gap: 10, cursor: "pointer" },
  dayNum:  { textAlign: "center", minWidth: 30 },
  panel:   { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#0d1221", borderTop: "1px solid #253347", padding: "16px 14px 28px", zIndex: 100 },
  panelH:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  fabRow:  { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, display: "flex", gap: 8, padding: "10px 13px 22px", background: "linear-gradient(to top,#060911 70%,transparent)", zIndex: 100 },
  fab:     { padding: 14, borderRadius: 12, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Unbounded',sans-serif" },
  btn:     { width: "100%", padding: 13, borderRadius: 10, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Unbounded',sans-serif" },
  inp:     { width: "100%", background: "#182030", border: "1px solid #253347", borderRadius: 8, padding: "10px 11px", color: "#e2e8f0", fontSize: 14, fontFamily: "'JetBrains Mono'", outline: "none", WebkitAppearance: "none", appearance: "none" },
  lbl:     { fontSize: 8, color: "#475569", fontFamily: "'JetBrains Mono'", marginBottom: 5, marginTop: 2 },
  xBtn:    { background: "none", border: "none", color: "#475569", fontSize: 18, cursor: "pointer" },
  addBtn:  { background: "linear-gradient(135deg,#1d4ed8,#2563eb)", border: "none", color: "#fff", fontSize: 10, fontWeight: 700, padding: "8px 14px", borderRadius: 9, cursor: "pointer", fontFamily: "'Unbounded',sans-serif" },
  mnBtn:   { background: "#182030", border: "1px solid #253347", color: "#e2e8f0", width: 34, height: 34, borderRadius: 8, fontSize: 18, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "#00000099", zIndex: 200, display: "flex", alignItems: "flex-end" },
  modal:   { background: "#0b0f1b", border: "1px solid #253347", borderRadius: "16px 16px 0 0", padding: "18px 14px 32px", width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "80vh", overflowY: "auto" },
  infoBox: { fontSize: 9, color: "#334155", fontFamily: "'JetBrains Mono'", background: "#0b0f1b", border: "1px solid #182030", borderRadius: 8, padding: "9px 11px", marginBottom: 12, lineHeight: 1.8 },
  empty:   { textAlign: "center", color: "#1e2d40", fontSize: 10, padding: "20px 0", fontFamily: "'JetBrains Mono'" },
};
