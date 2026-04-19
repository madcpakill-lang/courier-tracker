import { useState, useEffect } from "react";

// ── utils ────────────────────────────────────────────────────────
const fz = n => Number(n || 0).toFixed(2);
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const p2 = n => String(n).padStart(2, "0");
const dateStr = (y, m, d) => `${y}-${p2(m + 1)}-${p2(d)}`;

const MRU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MGE = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const DOW = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];

// ── storage ──────────────────────────────────────────────────────
const LS = {
  get: (k, d) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const KEY_BILLS = "kpl_bills_v1";
const KEY_LOG   = (y, m) => `kpl_log_${y}_${m}`;
const KEY_GOALS = "kpl_goals_v1";

// ── default bills ────────────────────────────────────────────────
const DEFAULT_BILLS = [
  { id: "rent",    label: "Аренда квартиры", icon: "🏠", freq: "monthly", day: 1,  dow: 4, amount: "" },
  { id: "scooter", label: "Аренда скутера",  icon: "🛵", freq: "weekly",  day: 1,  dow: 4, amount: "" },
  { id: "phone",   label: "Телефон",         icon: "📱", freq: "monthly", day: 15, dow: 4, amount: "" },
  { id: "food",    label: "Еда",             icon: "🍲", freq: "daily",   day: 1,  dow: 4, amount: "" },
  { id: "smokes",  label: "Сигареты",        icon: "🚬", freq: "daily",   day: 1,  dow: 4, amount: "" },
  { id: "fuel",    label: "Топливо",         icon: "⛽", freq: "daily",   day: 1,  dow: 4, amount: "" },
];

// how many times weekly bill fires in a month
const weeklyCount = (dow, y, m) => {
  let n = 0;
  for (let d = 1; d <= dim(y, m); d++) if (new Date(y, m, d).getDay() === dow) n++;
  return n;
};

// monthly cost of a bill
const billMonthlyCost = (b, y, m) => {
  const amt = parseFloat(b.amount) || 0;
  if (b.freq === "weekly") return amt * weeklyCount(b.dow, y, m);
  return amt;
};

// ── expense categories ───────────────────────────────────────────
const EXP_CATS = [
  { id: "food",      label: "Еда",        icon: "🍲" },
  { id: "fuel",      label: "Топливо",    icon: "⛽" },
  { id: "smokes",    label: "Сигареты",   icon: "🚬" },
  { id: "transport", label: "Транспорт",  icon: "🚌" },
  { id: "health",    label: "Здоровье",   icon: "💊" },
  { id: "other",     label: "Прочее",     icon: "📦" },
];

// ── main app ─────────────────────────────────────────────────────
export default function App() {
  const now = new Date();
  const CY = now.getFullYear(), CM = now.getMonth(), CD = now.getDate();
  const HH = p2(now.getHours()), MM = p2(now.getMinutes());

  const [tab, setTab] = useState("today");
  const [year, setYear] = useState(CY);
  const [month, setMonth] = useState(CM);

  const [bills, setBills]   = useState(() => LS.get(KEY_BILLS, DEFAULT_BILLS));
  const [log, setLog]       = useState(() => LS.get(KEY_LOG(CY, CM), {}));
  const [goals, setGoals]   = useState(() => LS.get(KEY_GOALS, []));

  // reload log when month changes
  useEffect(() => { setLog(LS.get(KEY_LOG(year, month), {})); }, [year, month]);

  // ── add income modal ────────────────────────────────────────────
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [incWolt, setIncWolt] = useState("");
  const [incBolt, setIncBolt] = useState("");
  const [incNote, setIncNote] = useState("");

  // ── add expense modal ────────────────────────────────────────────
  const [showAddExp, setShowAddExp] = useState(false);
  const [expCat, setExpCat] = useState("food");
  const [expAmt, setExpAmt] = useState("");
  const [expLabel, setExpLabel] = useState("");

  // ── day detail modal ─────────────────────────────────────────────
  const [dayModal, setDayModal] = useState(null); // date string or null

  // ── bill edit state ──────────────────────────────────────────────
  const [editBillId, setEditBillId] = useState(null);

  const isCurrent = year === CY && month === CM;
  const todayKey  = dateStr(CY, CM, CD);
  const totalDays = dim(year, month);

  // ── aggregations ─────────────────────────────────────────────────
  const totalBills = bills.reduce((s, b) => s + billMonthlyCost(b, year, month), 0);
  // dailyTarget = totalBills / days remaining from today (not total days!)
  // Example: 4000 zł / 12 days left in April = 333 zł/day
  const daysRemaining = isCurrent ? Math.max(1, totalDays - CD + 1) : totalDays;
  const dailyTarget = totalBills > 0 ? totalBills / daysRemaining : 0;

  // all income entries this month
  const allEntries = Object.values(log).flat();
  const monthWolt = allEntries.filter(e => e.type === "income").reduce((s, e) => s + (parseFloat(e.wolt) || 0), 0);
  const monthBolt = allEntries.filter(e => e.type === "income").reduce((s, e) => s + (parseFloat(e.bolt) || 0), 0);
  const monthInc  = monthWolt + monthBolt;
  const monthExp  = allEntries.filter(e => e.type === "expense").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  // T+1: received = earned before today
  let received = 0;
  Object.entries(log).forEach(([dk, entries]) => {
    if (!isCurrent || dk < todayKey) {
      entries.filter(e => e.type === "income").forEach(e => {
        received += (parseFloat(e.wolt) || 0) + (parseFloat(e.bolt) || 0);
      });
    }
  });

  const netMonth   = received - totalBills - monthExp;
  const remaining  = Math.max(0, totalBills - received);
  const daysLeft   = daysRemaining;  // same as daysRemaining
  const needPerDay = remaining / daysLeft;
  const monthPct   = pct(received, totalBills);

  // today
  const todayEntries = log[todayKey] || [];
  const todayWolt    = todayEntries.filter(e => e.type === "income").reduce((s, e) => s + (parseFloat(e.wolt) || 0), 0);
  const todayBolt    = todayEntries.filter(e => e.type === "income").reduce((s, e) => s + (parseFloat(e.bolt) || 0), 0);
  const todayInc     = todayWolt + todayBolt;
  const todayExp     = todayEntries.filter(e => e.type === "expense").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const todayNet     = todayInc - todayExp;
  const todayPct = dailyTarget > 0 
    ? Math.round(((todayInc - dailyTarget) / dailyTarget) * 100) 
    : todayInc > 0 ? 100 : -100;

  // T+1 arrived today = yesterday's income
  const yesterday = new Date(CY, CM, CD - 1);
  const yKey = dateStr(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const arrivedToday = (log[yKey] || []).filter(e => e.type === "income").reduce((s, e) => s + (parseFloat(e.wolt) || 0) + (parseFloat(e.bolt) || 0), 0);

  // next payments in next 30 days
  const upcoming = [];
  for (let off = 0; off <= 30; off++) {
    const dt = new Date(CY, CM, CD + off);
    bills.forEach(b => {
      if (!parseFloat(b.amount)) return;
      const fires = b.freq === "weekly"
        ? dt.getDay() === b.dow
        : dt.getDate() === b.day;
      if (fires) upcoming.push({ ...b, daysAway: off, dt });
    });
  }
  const nextBill = upcoming[0] || null;

  // ── mutations ────────────────────────────────────────────────────
  function mutLog(newLog) {
    setLog(newLog);
    LS.set(KEY_LOG(year, month), newLog);
  }

  function addIncome() {
    const w = parseFloat(incWolt) || 0;
    const b2 = parseFloat(incBolt) || 0;
    if (!w && !b2) return;
    const entry = { id: Date.now(), type: "income", wolt: String(w), bolt: String(b2), note: incNote, ts: new Date().toISOString() };
    const cur = log[todayKey] || [];
    mutLog({ ...log, [todayKey]: [...cur, entry] });
    setIncWolt(""); setIncBolt(""); setIncNote("");
    setShowAddIncome(false);
  }

  function addExpense() {
    const amt = parseFloat(expAmt);
    if (!amt) return;
    const cat = EXP_CATS.find(c => c.id === expCat);
    const entry = { id: Date.now(), type: "expense", cat: expCat, label: expLabel || cat?.label || "Расход", amount: String(amt), ts: new Date().toISOString() };
    const cur = log[todayKey] || [];
    mutLog({ ...log, [todayKey]: [...cur, entry] });
    setExpAmt(""); setExpLabel("");
    setShowAddExp(false);
  }

  function deleteEntry(dk, id) {
    const updated = (log[dk] || []).filter(e => e.id !== id);
    mutLog({ ...log, [dk]: updated });
  }

  function updateBill(id, field, val) {
    const n = bills.map(b => b.id === id ? { ...b, [field]: val } : b);
    setBills(n); LS.set(KEY_BILLS, n);
  }

  function addBill() {
    const nb = { id: "b" + Date.now(), label: "Новый платёж", icon: "💳", freq: "monthly", day: 1, dow: 4, amount: "" };
    const n = [...bills, nb];
    setBills(n); LS.set(KEY_BILLS, n);
  }

  function deleteBill(id) {
    const n = bills.filter(b => b.id !== id);
    setBills(n); LS.set(KEY_BILLS, n);
  }

  function addGoal() {
    const n = [...goals, { id: "g" + Date.now(), label: "", target: "", saved: "", deadline: "" }];
    setGoals(n); LS.set(KEY_GOALS, n);
  }

  function updateGoal(id, f, v) {
    const n = goals.map(g => g.id === id ? { ...g, [f]: v } : g);
    setGoals(n); LS.set(KEY_GOALS, n);
  }

  function deleteGoal(id) {
    const n = goals.filter(g => g.id !== id);
    setGoals(n); LS.set(KEY_GOALS, n);
  }

  function prevMonth() { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); }

  // ── colors ───────────────────────────────────────────────────────
  const dayColor   = todayPct >= 0 ? "#22c55e" : todayPct >= -30 ? "#fbbf24" : "#f97316";
  const monthColor = netMonth >= 0 ? "#22c55e" : "#f97316";

  // ── calendar grid ────────────────────────────────────────────────
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const calCells = Array(firstDow).fill(null).concat(Array.from({ length: totalDays }, (_, i) => i + 1));

  // ── render ───────────────────────────────────────────────────────
  return (
    <div style={R.root}>
      <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.2} }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        select { -webkit-appearance: none; appearance: none; }
      `}</style>

      {/* NAV */}
      <div style={R.nav}>
        {[["today","⚡"],["calendar","📅"],["month","📊"],["payments","💳"],["goals","🎯"],["settings","⚙️"]].map(([id, ic]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ ...R.navBtn, ...(tab === id ? R.navOn : {}) }}>{ic}</button>
        ))}
      </div>

      {/* ════════ TODAY ════════ */}
      {tab === "today" && (
        <div style={R.page}>
          {/* header */}
          <div style={R.hdr}>
            <div>
              <div style={R.clock}>{HH}<span style={{ animation: "pulse 2s infinite" }}>:</span>{MM}</div>
              <div style={R.dstr}>{DOW[now.getDay()]} · {CD} {MGE[CM]} {CY}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={R.logo}>🛵 КурьерP&L</div>
              {arrivedToday > 0 && <div style={R.badge}>+{fz(arrivedToday)} zł пришло</div>}
            </div>
          </div>

          {/* PNL card */}
          <div style={{ ...R.card, borderColor: dayColor + "55", marginBottom: 10 }}>
            <div style={R.micro}>P&L СЕГОДНЯ · {HH}:{MM}</div>
            <div style={{ ...R.pnlBig, color: dayColor }}>
              {todayPct >= 0 ? `+${todayPct}%` : `${todayPct}%`}
            </div>
            <div style={{ fontSize: 10, color: dayColor, fontFamily: "'JetBrains Mono'", marginBottom: 12 }}>
              {todayPct >= 0
                ? `+${fz(todayInc - dailyTarget)} zł сверх цели 🔥`
                : todayInc > 0
                  ? `ещё ${fz(dailyTarget - todayInc)} zł до нуля`
                  : `цель дня ${fz(dailyTarget)} zł`}
            </div>

            {/* stats row */}
            <div style={R.row4}>
              <div style={R.stat}><div style={R.stL}>Wolt</div><div style={{ ...R.stV, color: "#00c2e0" }}>{fz(todayWolt)}</div></div>
              <div style={R.sdiv} />
              <div style={R.stat}><div style={R.stL}>Bolt</div><div style={{ ...R.stV, color: "#34d45a" }}>{fz(todayBolt)}</div></div>
              <div style={R.sdiv} />
              <div style={R.stat}><div style={R.stL}>Расход</div><div style={{ ...R.stV, color: "#ef4444" }}>{fz(todayExp)}</div></div>
              <div style={R.sdiv} />
              <div style={R.stat}><div style={R.stL}>Нетто</div><div style={{ ...R.stV, color: todayNet >= 0 ? "#22c55e" : "#f97316" }}>{todayNet >= 0 ? "+" : ""}{fz(todayNet)}</div></div>
            </div>

            {/* bar */}
            <div style={R.barTrack}><div style={{ ...R.barFill, width: `${Math.min(Math.max((todayPct + 100) / 2, 0), 100)}%`, background: dayColor }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#334155", fontFamily: "'JetBrains Mono'", marginTop: 4 }}>
              <span>−100%</span><span style={{color:"#475569"}}>0% = цель {fz(dailyTarget)} zł</span><span style={{color:"#22c55e"}}>+%</span>
            </div>
          </div>

          {/* month mini */}
          <div style={{ ...R.card, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={R.micro}>МЕСЯЦ · {MRU[CM]}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: pct(monthInc,totalBills)>=100?"#22c55e":pct(monthInc,totalBills)>=60?"#fbbf24":"#f97316", letterSpacing: "-1px" }}>{pct(monthInc,totalBills)}%</div>
                <div style={{ fontSize: 8, color: "#253347", fontFamily: "'JetBrains Mono'", marginTop: 2 }}>⏳ +{fz(todayInc)} zł придёт завтра</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: (monthInc-totalBills-monthExp)>=0?"#22c55e":"#f97316", fontFamily: "'JetBrains Mono'" }}>{(monthInc-totalBills-monthExp)>=0?"+":""}{fz(monthInc-totalBills-monthExp)} zł</div>
                <div style={{ fontSize: 9, color: "#334155", fontFamily: "'JetBrains Mono'" }}>нетто месяца</div>
                <div style={{ fontSize: 9, color: "#fbbf24", fontFamily: "'JetBrains Mono'", marginTop: 2 }}>нужно {fz(needPerDay)} zł/день</div>
              </div>
            </div>
            <div style={R.barTrack}><div style={{ ...R.barFill, width: `${Math.min(pct(monthInc,totalBills),100)}%`, background: pct(monthInc,totalBills) >= 100 ? "linear-gradient(90deg,#16a34a,#22c55e)" : pct(monthInc,totalBills) >= 60 ? "linear-gradient(90deg,#d97706,#fbbf24)" : "linear-gradient(90deg,#be123c,#f43f5e)" }} /></div>
          </div>

          {/* smart advice */}
          {(()=>{
            let emoji="🛵", text=`Цель дня ${fz(dailyTarget)} zł — начни смену`, color="#475569";
            if(nextBill && nextBill.daysAway===0 && received<parseFloat(nextBill.amount||0)){
              emoji="🚨"; color="#ef4444"; text=`Сегодня платёж ${nextBill.label} — нужно ${fz(parseFloat(nextBill.amount)-received)} zł`;
            } else if(nextBill && nextBill.daysAway<=3 && received<parseFloat(nextBill.amount||0)){
              emoji="⚡"; color="#f97316"; text=`Через ${nextBill.daysAway} дн платёж ${fz(parseFloat(nextBill.amount))} zł — поднажми`;
            } else if(todayPct>=50){
              emoji="🔥"; color="#22c55e"; text=`P&L +${todayPct}% — отличный день!`;
            } else if(todayPct>=0){
              emoji="✅"; color="#22c55e"; text="Вышел в ноль! Теперь каждый заказ — чистая прибыль";
            } else if(todayPct>=-30){
              emoji="💪"; color="#fbbf24"; text=`Почти ноль — ещё ${fz(Math.max(0,dailyTarget-todayInc))} zł`;
            } else if(todayInc>0){
              emoji="🎯"; color="#f97316"; text=`P&L ${todayPct}% — продолжай, ты в пути`;
            }
            return (
              <div style={{background:"#0b0f1b",border:"1px solid "+color+"44",borderRadius:12,padding:"11px 13px",marginBottom:10,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{emoji}</span>
                <span style={{fontSize:11,fontWeight:700,color,lineHeight:1.4,flex:1}}>{text}</span>
              </div>
            );
          })()}

          {/* next payment */}
          {nextBill && (
            <div style={{ ...R.card, borderColor: nextBill.daysAway <= 1 ? "#ef444466" : nextBill.daysAway <= 3 ? "#f9731666" : "#182030", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 26 }}>{nextBill.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={R.micro}>БЛИЖАЙШИЙ ПЛАТЁЖ</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{nextBill.label}</div>
                <div style={{ fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono'" }}>
                  {nextBill.freq === "weekly" ? `Каждый ${DOW[nextBill.dow]}` : `${nextBill.day}-го числа`} · {nextBill.dt.getDate()} {MGE[nextBill.dt.getMonth()]}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "'JetBrains Mono'" }}>{fz(parseFloat(nextBill.amount))} zł</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: nextBill.daysAway === 0 ? "#ef4444" : nextBill.daysAway <= 3 ? "#f97316" : "#22c55e", fontFamily: "'JetBrains Mono'" }}>
                  {nextBill.daysAway === 0 ? "⚠️ СЕГОДНЯ" : nextBill.daysAway === 1 ? "ЗАВТРА" : `через ${nextBill.daysAway} дн`}
                </div>
              </div>
            </div>
          )}

          {/* today entries */}
          {todayEntries.length > 0 && (
            <div style={{ ...R.card, marginBottom: 10 }}>
              <div style={R.micro}>ЗАПИСИ СЕГОДНЯ</div>
              {todayEntries.map(e => (
                <div key={e.id} style={R.entRow}>
                  <span style={R.entTime}>{new Date(e.ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                  <div style={{ flex: 1 }}>
                    {e.type === "income" ? (
                      <span style={{ fontSize: 11 }}>
                        {parseFloat(e.wolt) > 0 && <span style={{ color: "#00c2e0", marginRight: 8 }}>W {fz(parseFloat(e.wolt))}</span>}
                        {parseFloat(e.bolt) > 0 && <span style={{ color: "#34d45a" }}>B {fz(parseFloat(e.bolt))}</span>}
                        {e.note && <span style={{ color: "#475569", fontSize: 9, marginLeft: 6 }}>{e.note}</span>}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#ef4444" }}>
                        {EXP_CATS.find(c => c.id === e.cat)?.icon} {e.label}
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 700, color: e.type === "income" ? "#22c55e" : "#ef4444" }}>
                    {e.type === "income" ? "+" : "−"}{fz(e.type === "income" ? (parseFloat(e.wolt) || 0) + (parseFloat(e.bolt) || 0) : parseFloat(e.amount))}
                  </span>
                  <button onClick={() => deleteEntry(todayKey, e.id)} style={R.delBtn}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ height: 100 }} />

          {/* ADD BUTTONS */}
          {!showAddIncome && !showAddExp && (
            <div style={R.fabRow}>
              <button style={{ ...R.fab, background: "linear-gradient(135deg,#16a34a,#15803d)", flex: 1 }}
                onClick={() => setShowAddIncome(true)}>
                ＋ Доход
              </button>
              <button style={{ ...R.fab, background: "linear-gradient(135deg,#b45309,#d97706)", flex: 1 }}
                onClick={() => setShowAddExp(true)}>
                ＋ Расход
              </button>
            </div>
          )}

          {/* ADD INCOME PANEL */}
          {showAddIncome && (
            <div style={R.panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>💰 Добавить доход</div>
                <button onClick={() => setShowAddIncome(false)} style={R.closeBtn}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={R.label}>🔵 Wolt (zł)</div>
                  <input style={R.inp} type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="0.00"
                    inputMode="decimal" value={incWolt}
                    onChange={e => setIncWolt(e.target.value)} autoFocus />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={R.label}>🟢 Bolt (zł)</div>
                  <input style={R.inp} type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="0.00"
                    inputMode="decimal" value={incBolt}
                    onChange={e => setIncBolt(e.target.value)} />
                </div>
              </div>
              <input style={{ ...R.inp, marginBottom: 12 }} type="text"
                placeholder="Заметка (необязательно)" value={incNote}
                onChange={e => setIncNote(e.target.value)} />
              <div style={{ fontSize: 8, color: "#334155", fontFamily: "'JetBrains Mono'", marginBottom: 10 }}>
                ⏳ T+1: деньги придут завтра — учтутся в балансе завтра
              </div>
              <button style={{ ...R.fab, background: "linear-gradient(135deg,#16a34a,#15803d)" }}
                onClick={addIncome}>✓ Записать</button>
            </div>
          )}

          {/* ADD EXPENSE PANEL */}
          {showAddExp && (
            <div style={R.panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f97316" }}>💸 Добавить расход</div>
                <button onClick={() => setShowAddExp(false)} style={R.closeBtn}>✕</button>
              </div>
              <div style={R.label}>Категория</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {EXP_CATS.map(c => (
                  <button key={c.id}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid", fontSize: 11, cursor: "pointer",
                      background: expCat === c.id ? "#182030" : "#0b0f1b",
                      borderColor: expCat === c.id ? "#f97316" : "#253347",
                      color: expCat === c.id ? "#e2e8f0" : "#475569",
                      fontFamily: "'JetBrains Mono'" }}
                    onClick={() => setExpCat(c.id)}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
              <div style={R.label}>Описание (необязательно)</div>
              <input style={{ ...R.inp, marginBottom: 10 }} type="text"
                placeholder="Что именно…" value={expLabel}
                onChange={e => setExpLabel(e.target.value)} />
              <div style={R.label}>Сумма (zł)</div>
              <input style={{ ...R.inp, marginBottom: 12 }} type="text" inputMode="decimal" pattern="[0-9.]*"
                placeholder="0.00" inputMode="decimal" value={expAmt}
                onChange={e => setExpAmt(e.target.value)} />
              <button style={{ ...R.fab, background: "linear-gradient(135deg,#b45309,#d97706)" }}
                onClick={addExpense}>✓ Записать</button>
            </div>
          )}
        </div>
      )}

      {/* ════════ CALENDAR ════════ */}
      {tab === "calendar" && (
        <div style={R.page}>
          <div style={R.monNav}>
            <button style={R.mnBtn} onClick={prevMonth}>‹</button>
            <span style={R.monLbl}>{MRU[month]} {year}</span>
            <button style={R.mnBtn} onClick={nextMonth}>›</button>
          </div>

          <div style={R.calGrid}>
            {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(w => (
              <div key={w} style={R.calWd}>{w}</div>
            ))}
            {calCells.map((d, i) => {
              if (!d) return <div key={"e" + i} />;
              const dk = dateStr(year, month, d);
              const entries = log[dk] || [];
              const inc = entries.filter(e => e.type === "income").reduce((s, e) => s + (parseFloat(e.wolt) || 0) + (parseFloat(e.bolt) || 0), 0);
              const exp = entries.filter(e => e.type === "expense").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
              const net = inc - exp;
              const isToday = isCurrent && d === CD;
              const isFuture = isCurrent && d > CD;
              const dp = dailyTarget > 0 ? Math.round((inc / dailyTarget) * 100) : 0;
              return (
                <div key={d}
                  style={{ ...R.calCell, ...(isToday ? R.calToday : {}), ...(isFuture ? { opacity: 0.35 } : {}), ...(inc > 0 ? { borderColor: net >= 0 ? "#16a34a55" : "#ef444433" } : {}) }}
                  onClick={() => !isFuture && setDayModal(dk)}>
                  <div style={{ ...R.calDN, color: isToday ? "#60a5fa" : inc > 0 ? "#e2e8f0" : "#334155" }}>{d}</div>
                  {inc > 0 && <div style={{ fontSize: 7, color: "#22c55e", fontFamily: "'JetBrains Mono'" }}>+{Math.round(inc)}</div>}
                  {exp > 0 && <div style={{ fontSize: 7, color: "#f97316", fontFamily: "'JetBrains Mono'" }}>−{Math.round(exp)}</div>}
                  {inc > 0 && <div style={{ fontSize: 7, fontWeight: 700, color: net >= 0 ? "#22c55e" : "#f97316", fontFamily: "'JetBrains Mono'" }}>{dp}%</div>}
                </div>
              );
            })}
          </div>

          {/* day list */}
          {Object.keys(log).filter(dk => {
            const [y, m] = dk.split("-").map(Number);
            return y === year && m === month + 1;
          }).sort((a, b) => b.localeCompare(a)).map(dk => {
            const entries = log[dk] || [];
            const inc = entries.filter(e => e.type === "income").reduce((s, e) => s + (parseFloat(e.wolt) || 0) + (parseFloat(e.bolt) || 0), 0);
            const exp = entries.filter(e => e.type === "expense").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
            const d = parseInt(dk.split("-")[2]);
            const dp = dailyTarget > 0 ? Math.round((inc / dailyTarget) * 100) : 0;
            if (!inc && !exp) return null;
            return (
              <div key={dk} style={R.dayRow} onClick={() => setDayModal(dk)}>
                <div style={R.dayNum}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#94a3b8", lineHeight: 1 }}>{d}</div>
                  <div style={{ fontSize: 8, color: "#334155", fontFamily: "'JetBrains Mono'" }}>{DOW[new Date(dk + "T12:00").getDay()]}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", fontFamily: "'JetBrains Mono'" }}>{fz(inc)} zł</span>
                    <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono'", fontWeight: 700, border: "1px solid", borderRadius: 20, padding: "2px 7px", color: dp >= 100 ? "#22c55e" : dp >= 70 ? "#fbbf24" : "#f97316", borderColor: dp >= 100 ? "#16a34a33" : "#f9731633" }}>{dp}%</span>
                  </div>
                  {exp > 0 && <div style={{ fontSize: 9, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>расход: {fz(exp)} zł · нетто: {(inc - exp) >= 0 ? "+" : ""}{fz(inc - exp)}</div>}
                </div>
              </div>
            );
          })}
          <div style={{ height: 20 }} />
        </div>
      )}

      {/* ════════ MONTH ════════ */}
      {tab === "month" && (
        <div style={R.page}>
          <div style={R.monNav}>
            <button style={R.mnBtn} onClick={prevMonth}>‹</button>
            <span style={R.monLbl}>{MRU[month]} {year}</span>
            <button style={R.mnBtn} onClick={nextMonth}>›</button>
          </div>

          <div style={{ ...R.card, marginBottom: 10 }}>
            <div style={R.micro}>ИТОГИ МЕСЯЦА</div>
            {[
              ["Заработано",       fz(monthInc) + " zł",     "#22c55e"],
              ["Получено (T+1)",   fz(received) + " zł",     "#60a5fa"],
              ["Расходы (переем.)",fz(monthExp) + " zł",     "#ef4444"],
              ["Платежи",          fz(totalBills) + " zł",   "#ef4444"],
              ["Нетто",            (netMonth >= 0 ? "+" : "") + fz(netMonth) + " zł", netMonth >= 0 ? "#22c55e" : "#f97316"],
              ["Wolt",             fz(monthWolt) + " zł",    "#00c2e0"],
              ["Bolt",             fz(monthBolt) + " zł",    "#34d45a"],
              ["Цель в день",      fz(dailyTarget) + " zł",  "#fbbf24"],
              ["Нужно сейчас/день",fz(needPerDay) + " zł",   needPerDay > dailyTarget * 1.3 ? "#ef4444" : "#fbbf24"],
              ["Выполнение",       monthPct + "%",            monthPct >= 100 ? "#22c55e" : "#f97316"],
            ].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #182030", fontSize: 11 }}>
                <span style={{ color: "#475569" }}>{l}</span>
                <span style={{ color: c, fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* expense breakdown */}
          <div style={{ ...R.card, marginBottom: 10 }}>
            <div style={R.micro}>РАСХОДЫ ПО КАТЕГОРИЯМ</div>
            {EXP_CATS.map(cat => {
              const amt = allEntries.filter(e => e.type === "expense" && e.cat === cat.id).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
              if (!amt) return null;
              const p = monthExp > 0 ? Math.round((amt / monthExp) * 100) : 0;
              return (
                <div key={cat.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                    <span>{cat.icon} {cat.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono'" }}>{fz(amt)} zł · {p}%</span>
                  </div>
                  <div style={{ height: 5, background: "#182030", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${p}%`, background: "#f97316", borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
            {monthExp === 0 && <div style={R.empty}>Нет расходов</div>}
          </div>
        </div>
      )}

      {/* ════════ PAYMENTS ════════ */}
      {tab === "payments" && (
        <div style={R.page}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>💳 Платежи</div>
          <div style={{ ...R.card, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0", borderBottom: "1px solid #182030", marginBottom: 4 }}>
              <span style={{ color: "#475569" }}>Итого в месяц</span>
              <span style={{ color: "#ef4444", fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>{fz(totalBills)} zł</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0" }}>
              <span style={{ color: "#475569" }}>Цель в день</span>
              <span style={{ color: "#fbbf24", fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>{fz(dailyTarget)} zł</span>
            </div>
          </div>

          {upcoming.slice(0, 6).map((b, i) => (
            <div key={b.id + i} style={{ ...R.card, marginBottom: 8, borderColor: b.daysAway <= 1 ? "#ef444466" : b.daysAway <= 3 ? "#f9731666" : "#182030" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 8, color: b.daysAway <= 1 ? "#ef4444" : b.daysAway <= 3 ? "#f97316" : "#475569", fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>
                    {b.daysAway === 0 ? "⚠️ СЕГОДНЯ" : b.daysAway === 1 ? "ЗАВТРА" : `через ${b.daysAway} дн · ${b.dt.getDate()} ${MGE[b.dt.getMonth()]}`}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{b.icon} {b.label}</div>
                  <div style={{ fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono'" }}>
                    {b.freq === "weekly" ? `Каждый ${DOW[b.dow]} · ${weeklyCount(b.dow, CY, CM)}× в месяц` : b.freq === "daily" ? `Каждый день · ${dim(CY, CM)}× в месяц` : `${b.day}-го числа`}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "'JetBrains Mono'" }}>{fz(parseFloat(b.amount))} zł</div>
                  <div style={{ fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono'" }}>
                    {b.freq === "weekly" ? `× ${weeklyCount(b.dow, CY, CM)} = ${fz(billMonthlyCost(b, CY, CM))} в мес` : "в месяц"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════ GOALS ════════ */}
      {tab === "goals" && (
        <div style={R.page}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>🎯 Мои цели</div>
            <button style={R.addBtn} onClick={addGoal}>＋ Добавить</button>
          </div>
          {goals.length === 0 && <div style={R.empty}>Нажми «Добавить» чтобы создать цель</div>}
          {goals.map(g => {
            const p = parseFloat(g.target) > 0 ? pct(parseFloat(g.saved), parseFloat(g.target)) : 0;
            const left = Math.max(0, (parseFloat(g.target) || 0) - (parseFloat(g.saved) || 0));
            return (
              <div key={g.id} style={{ ...R.card, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input style={{ ...R.inp, flex: 1, fontSize: 13, fontWeight: 700 }} placeholder="На что коплю…"
                    value={g.label} onChange={e => updateGoal(g.id, "label", e.target.value)} />
                  <button style={{ ...R.delBtn, fontSize: 16 }} onClick={() => deleteGoal(g.id)}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={R.label}>Нужно (zł)</div>
                    <input style={R.inp} type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="0" inputMode="decimal"
                      value={g.target} onChange={e => updateGoal(g.id, "target", e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={R.label}>Накоплено (zł)</div>
                    <input style={R.inp} type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="0" inputMode="decimal"
                      value={g.saved} onChange={e => updateGoal(g.id, "saved", e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={R.label}>Дедлайн</div>
                    <input style={{ ...R.inp, fontSize: 11 }} type="date"
                      value={g.deadline} onChange={e => updateGoal(g.id, "deadline", e.target.value)} />
                  </div>
                </div>
                {parseFloat(g.target) > 0 && (
                  <>
                    <div style={{ height: 8, background: "#182030", borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ height: "100%", width: `${p}%`, background: p >= 100 ? "linear-gradient(90deg,#16a34a,#22c55e)" : "linear-gradient(90deg,#1d4ed8,#60a5fa)", borderRadius: 99, transition: "width .5s" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: "'JetBrains Mono'" }}>
                      <span style={{ color: p >= 100 ? "#22c55e" : "#60a5fa" }}>{p}% · {fz(parseFloat(g.saved) || 0)} zł</span>
                      {p < 100 && <span style={{ color: "#334155" }}>осталось {fz(left)} zł</span>}
                      {p >= 100 && <span style={{ color: "#22c55e" }}>✅ Цель достигнута!</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════ SETTINGS ════════ */}
      {tab === "settings" && (
        <div style={R.page}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>⚙️ Мои платежи</div>
            <button style={R.addBtn} onClick={addBill}>＋ Добавить</button>
          </div>
          <div style={R.infoBox}>Аренда скутера — выбери «Еженед.» и день «Чт». Аренда квартиры — «В месяц» и число «1».</div>

          {bills.map(b => (
            <div key={b.id} style={{ ...R.card, marginBottom: 10, flexDirection: "column", gap: 10 }}>
              {/* name + icon + delete */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={b.icon} onChange={e => updateBill(b.id, "icon", e.target.value)}
                  style={{ ...R.inp, width: 50, padding: "8px 4px", fontSize: 20, textAlign: "center", flexShrink: 0 }}>
                  {["🏠","🛵","📱","🌐","💳","🍲","⛽","🚬","💊","📦","🎯","🚗","✈️","👕"].map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                <input style={{ ...R.inp, flex: 1, fontSize: 13, fontWeight: 700 }} type="text"
                  placeholder="Название платежа" value={b.label}
                  onChange={e => updateBill(b.id, "label", e.target.value)} />
                <button style={{ ...R.delBtn, fontSize: 18, padding: "0 6px" }} onClick={() => deleteBill(b.id)}>✕</button>
              </div>

              {/* amount + frequency */}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={R.label}>Сумма (zł)</div>
                  <input style={{ ...R.inp, fontSize: 15, fontWeight: 700 }} type="text" inputMode="decimal" pattern="[0-9.]*"
                    placeholder="0.00" value={b.amount}
                    onChange={e => { const v = e.target.value.replace(/[^0-9.]/g,""); updateBill(b.id, "amount", v); }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={R.label}>Частота</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[["monthly", "В мес."], ["weekly", "Еженед."], ["daily", "Ежедн."]].map(([fr, lbl]) => (
                      <button key={fr} onClick={() => updateBill(b.id, "freq", fr)}
                        style={{ flex: 1, padding: "9px 2px", borderRadius: 7, border: "1px solid", fontSize: 8, cursor: "pointer",
                          fontFamily: "'Unbounded',sans-serif", fontWeight: 700,
                          background: b.freq === fr ? "#1e3a5f" : "#0b0f1b",
                          borderColor: b.freq === fr ? "#3b82f6" : "#253347",
                          color: b.freq === fr ? "#e2e8f0" : "#475569" }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* day picker */}
              {b.freq === "daily" ? (
                <div style={{ fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono'", padding: "6px 10px", background: "#182030", borderRadius: 7 }}>
                  Каждый день · {dim(year, month)} дней · итого {fz((parseFloat(b.amount)||0)*dim(year,month))} zł в {MRU[month]}
                </div>
              ) : b.freq === "monthly" ? (
                <div>
                  <div style={R.label}>Число месяца когда списывается</div>
                  <input style={{ ...R.inp, width: 100 }} type="text" inputMode="numeric" pattern="[0-9]*"
                    placeholder="1-31" value={b.day === undefined ? "" : String(b.day)}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      updateBill(b.id, "day", raw);
                    }}
                    onBlur={e => {
                      const n = parseInt(e.target.value);
                      updateBill(b.id, "day", (!n || n < 1) ? 1 : n > 31 ? 31 : n);
                    }} />
                </div>
              ) : (
                <div>
                  <div style={R.label}>День недели</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {DOW.map((d, i) => (
                      <button key={i} onClick={() => updateBill(b.id, "dow", i)}
                        style={{ flex: 1, padding: "7px 2px", borderRadius: 7, border: "1px solid", fontSize: 10, cursor: "pointer",
                          fontFamily: "'JetBrains Mono'",
                          background: (b.dow === i) ? "#1e3a5f" : "#0b0f1b",
                          borderColor: (b.dow === i) ? "#3b82f6" : "#253347",
                          color: (b.dow === i) ? "#e2e8f0" : "#475569" }}>
                        {d}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono'", marginTop: 6 }}>
                    В {MRU[month]}: {weeklyCount(b.dow, year, month)}× · итого {fz(billMonthlyCost(b, year, month))} zł
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={{ ...R.card, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid #182030" }}>
              <span style={{ color: "#475569" }}>Итого расходов</span>
              <span style={{ color: "#ef4444", fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>{fz(totalBills)} zł / мес</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0" }}>
              <span style={{ color: "#475569" }}>Минимум в день</span>
              <span style={{ color: "#fbbf24", fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>{fz(dailyTarget)} zł</span>
            </div>
          </div>
          <div style={R.infoBox}>T+1: Wolt и Bolt переводят деньги на следующий день. Баланс считается только из полученных денег.</div>
        </div>
      )}

      {/* ════════ DAY MODAL ════════ */}
      {dayModal && (
        <div style={R.overlay} onClick={e => { if (e.target === e.currentTarget) setDayModal(null); }}>
          <div style={R.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 900 }}>
                {parseInt(dayModal.split("-")[2])} {MGE[parseInt(dayModal.split("-")[1]) - 1]} {dayModal.split("-")[0]}
              </div>
              <button style={R.closeBtn} onClick={() => setDayModal(null)}>✕</button>
            </div>
            {(log[dayModal] || []).map(e => (
              <div key={e.id} style={R.entRow}>
                <span style={R.entTime}>{new Date(e.ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                <div style={{ flex: 1 }}>
                  {e.type === "income" ? (
                    <span style={{ fontSize: 11 }}>
                      {parseFloat(e.wolt) > 0 && <span style={{ color: "#00c2e0", marginRight: 8 }}>Wolt {fz(parseFloat(e.wolt))}</span>}
                      {parseFloat(e.bolt) > 0 && <span style={{ color: "#34d45a" }}>Bolt {fz(parseFloat(e.bolt))}</span>}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "#ef4444" }}>
                      {EXP_CATS.find(c => c.id === e.cat)?.icon} {e.label}
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 700, color: e.type === "income" ? "#22c55e" : "#ef4444" }}>
                  {e.type === "income" ? "+" : "−"}{fz(e.type === "income" ? (parseFloat(e.wolt) || 0) + (parseFloat(e.bolt) || 0) : parseFloat(e.amount))}
                </span>
                <button onClick={() => deleteEntry(dayModal, e.id)} style={R.delBtn}>✕</button>
              </div>
            ))}
            {(log[dayModal] || []).length === 0 && <div style={R.empty}>Нет записей за этот день</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── styles ───────────────────────────────────────────────────────
const R = {
  root: { fontFamily: "'Unbounded',sans-serif", background: "#060911", minHeight: "100vh", color: "#e2e8f0", maxWidth: 480, margin: "0 auto" },
  nav: { display: "flex", background: "#0b0f1b", borderBottom: "1px solid #182030", position: "sticky", top: 0, zIndex: 50 },
  navBtn: { flex: 1, padding: "12px 4px", background: "none", border: "none", borderBottom: "2px solid transparent", color: "#253347", fontSize: 18, cursor: "pointer" },
  navOn: { color: "#e2e8f0", borderBottom: "2px solid #3b82f6" },
  page: { padding: "12px 13px 100px" },
  hdr: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  clock: { fontSize: 30, fontWeight: 900, fontFamily: "'JetBrains Mono'", letterSpacing: -2, lineHeight: 1 },
  dstr: { fontSize: 9, color: "#334155", fontFamily: "'JetBrains Mono'", marginTop: 2 },
  logo: { fontSize: 13, fontWeight: 900 },
  badge: { background: "#052e16", border: "1px solid #16a34a44", color: "#22c55e", fontSize: 8, fontFamily: "'JetBrains Mono'", padding: "3px 8px", borderRadius: 20, marginTop: 4, display: "inline-block" },
  card: { background: "#0b0f1b", border: "1px solid #182030", borderRadius: 12, padding: "12px 13px", display: "flex", flexDirection: "column" },
  micro: { fontSize: 7, color: "#253347", fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 6 },
  pnlBig: { fontSize: 42, fontWeight: 900, letterSpacing: "-3px", lineHeight: 1 },
  row4: { display: "flex", background: "#0f1826", borderRadius: 9, overflow: "hidden", marginBottom: 10 },
  stat: { flex: 1, padding: "8px 4px", textAlign: "center" },
  stL: { fontSize: 7, color: "#253347", fontFamily: "'JetBrains Mono'", marginBottom: 3 },
  stV: { fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono'" },
  sdiv: { width: 1, background: "#182030" },
  barTrack: { height: 7, background: "#182030", borderRadius: 99, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99, transition: "width .6s ease" },
  monNav: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  monLbl: { fontSize: 14, fontWeight: 700, color: "#94a3b8" },
  mnBtn: { background: "#182030", border: "1px solid #253347", color: "#e2e8f0", width: 34, height: 34, borderRadius: 8, fontSize: 18, cursor: "pointer" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 10 },
  calWd: { fontSize: 7, color: "#253347", textAlign: "center", padding: "3px 0", fontFamily: "'JetBrains Mono'" },
  calCell: { background: "#0b0f1b", border: "1px solid #182030", borderRadius: 6, padding: "4px 2px", minHeight: 52, cursor: "pointer" },
  calToday: { background: "#0c1628", border: "1px solid #1d4ed8" },
  calDN: { fontSize: 10, fontWeight: 700, marginBottom: 1, textAlign: "center" },
  dayRow: { background: "#0b0f1b", border: "1px solid #182030", borderRadius: 10, padding: "10px 12px", marginBottom: 8, display: "flex", gap: 10, cursor: "pointer" },
  dayNum: { textAlign: "center", minWidth: 30 },
  entRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #182030" },
  entTime: { fontSize: 8, color: "#253347", fontFamily: "'JetBrains Mono'", minWidth: 32 },
  delBtn: { background: "none", border: "none", color: "#253347", cursor: "pointer", fontSize: 12, padding: "0 2px" },
  fabRow: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, display: "flex", gap: 8, padding: "10px 13px 22px", background: "linear-gradient(to top, #060911 70%, transparent)", zIndex: 100 },
  fab: { padding: 14, borderRadius: 12, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Unbounded',sans-serif" },
  panel: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#0d1221", borderTop: "1px solid #253347", padding: "16px 14px 28px", zIndex: 100 },
  closeBtn: { background: "none", border: "none", color: "#475569", fontSize: 18, cursor: "pointer" },
  inp: { width: "100%", background: "#182030", border: "1px solid #253347", borderRadius: 8, padding: "10px 11px", color: "#e2e8f0", fontSize: 14, fontFamily: "'JetBrains Mono'", outline: "none", WebkitAppearance: "none", appearance: "none" },
  label: { fontSize: 8, color: "#475569", fontFamily: "'JetBrains Mono'", marginBottom: 5, marginTop: 2 },
  infoBox: { fontSize: 9, color: "#253347", fontFamily: "'JetBrains Mono'", background: "#0b0f1b", border: "1px solid #182030", borderRadius: 8, padding: "9px 11px", marginBottom: 12, lineHeight: 1.8 },
  addBtn: { background: "linear-gradient(135deg,#1d4ed8,#2563eb)", border: "none", color: "#fff", fontSize: 10, fontWeight: 700, padding: "8px 14px", borderRadius: 9, cursor: "pointer", fontFamily: "'Unbounded',sans-serif" },
  overlay: { position: "fixed", inset: 0, background: "#00000099", zIndex: 200, display: "flex", alignItems: "flex-end" },
  modal: { background: "#0b0f1b", border: "1px solid #253347", borderRadius: "16px 16px 0 0", padding: "18px 14px 32px", width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "80vh", overflowY: "auto" },
  empty: { textAlign: "center", color: "#1e2d40", fontSize: 10, padding: "20px 0", fontFamily: "'JetBrains Mono'" },
};
