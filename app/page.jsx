'use client';

import { useEffect, useMemo, useState } from 'react';

const AR_DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const SHIFTS = {
  morning: { label: 'صباحي 06:00 → 14:00', in: '06:00', out: '14:00' },
  evening: { label: 'مسائي 14:00 → 22:00', in: '14:00', out: '22:00' },
  flexible: { label: 'مرن / يحدد لكل يوم', in: '', out: '' },
};

function pad(n){ return String(n).padStart(2,'0'); }
function iso(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function fromISO(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function monthParts(month){ const [y,m]=month.split('-').map(Number); return { y, m }; }

function periodFrom(mode, month){
  const { y, m } = monthParts(month);
  if(mode === 'monthly'){
    return { start: new Date(y,m-1,1), end: new Date(y,m,0) };
  }
  if(mode === 'cycle'){
    return { start: new Date(y,m-2,26), end: new Date(y,m-1,25) };
  }
  return null;
}

function workedMinutes(checkIn, checkOut){
  if(!checkIn || !checkOut) return 0;
  const [ih,im]=checkIn.split(':').map(Number);
  const [oh,om]=checkOut.split(':').map(Number);
  let a=ih*60+im, b=oh*60+om;
  if(b<=a) b+=1440;
  return b-a;
}

function generateDays(start,end,oldRows={}){
  const result=[];
  for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)){
    const key=iso(d), friday=d.getDay()===5;
    result.push({
      date:key,
      day:AR_DAYS[d.getDay()],
      friday,
      checkIn: oldRows[key]?.checkIn || '',
      checkOut: oldRows[key]?.checkOut || '',
    });
  }
  return result;
}

export default function Home(){
  const [employee,setEmployee]=useState('');
  const [shift,setShift]=useState('morning');
  const [mode,setMode]=useState('cycle');
  const [month,setMonth]=useState('2026-08');
  const [customStart,setCustomStart]=useState('2026-07-26');
  const [customEnd,setCustomEnd]=useState('2026-08-25');
  const [rows,setRows]=useState([]);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    try{
      const raw=localStorage.getItem('attendance-nextjs-standalone');
      if(raw){
        const s=JSON.parse(raw);
        setEmployee(s.employee || ''); setShift(s.shift || 'morning'); setMode(s.mode || 'cycle');
        setMonth(s.month || '2026-08'); setCustomStart(s.customStart || '2026-07-26'); setCustomEnd(s.customEnd || '2026-08-25');
        setRows(s.rows || []);
      }
    } finally { setLoaded(true); }
  },[]);

  useEffect(()=>{
    if(!loaded) return;
    localStorage.setItem('attendance-nextjs-standalone', JSON.stringify({employee,shift,mode,month,customStart,customEnd,rows}));
  },[loaded,employee,shift,mode,month,customStart,customEnd,rows]);

  const effectivePeriod=useMemo(()=>{
    if(mode==='custom') return {start:fromISO(customStart),end:fromISO(customEnd)};
    return periodFrom(mode,month);
  },[mode,month,customStart,customEnd]);

  function buildPeriod(){
    if(!effectivePeriod || effectivePeriod.end < effectivePeriod.start) return alert('تحقق من الفترة المحددة.');
    const old=Object.fromEntries(rows.map(r=>[r.date,r]));
    setRows(generateDays(effectivePeriod.start,effectivePeriod.end,old));
  }

  function updateRow(date,field,value){
    setRows(prev=>prev.map(r=>r.date===date?{...r,[field]:value}:r));
  }

  function fillStandard(){
    const s=SHIFTS[shift];
    if(!s.in) return alert('اختر وردية صباحية أو مسائية أولًا.');
    setRows(prev=>prev.map(r=>r.friday?r:{...r,checkIn:s.in,checkOut:s.out}));
  }

  function clearTimes(){
    if(confirm('مسح كل أوقات الحضور والانصراف؟')) setRows(prev=>prev.map(r=>({...r,checkIn:'',checkOut:''})));
  }

  const summary=useMemo(()=>{
    let total=0, complete=0, fridays=0, workDays=0;
    for(const r of rows){
      if(r.friday){fridays++;continue;}
      workDays++;
      if(r.checkIn && r.checkOut){ total+=workedMinutes(r.checkIn,r.checkOut); complete++; }
    }
    return {
      total,
      hours:Math.floor(total/60), mins:total%60,
      decimalHours:total/60,
      equivalentDays:total/480,
      complete, fridays, workDays,
    };
  },[rows]);

  const periodLabel = rows.length ? `${rows[0].date} → ${rows[rows.length-1].date}` : 'لم يتم إنشاء الأيام بعد';

  return <main>
    <section className="hero no-print">
      <div>
        <span className="eyebrow">Next.js Standalone</span>
        <h1>حاسبة دوام الموظفين</h1>
        <p>بدون قاعدة بيانات. إعداد مرن، حساب لحظي، وحفظ محلي في المتصفح.</p>
      </div>
      <button className="pdf" onClick={()=>window.print()}>تصدير / حفظ PDF</button>
    </section>

    <section className="card settings no-print">
      <h2>إعدادات التهيئة</h2>
      <div className="grid">
        <label>اسم الموظف<input value={employee} onChange={e=>setEmployee(e.target.value)} placeholder="مثال: أحمد سعيد" /></label>
        <label>نوع الدوام<select value={shift} onChange={e=>setShift(e.target.value)}>{Object.entries(SHIFTS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label>
        <label>طريقة الفترة<select value={mode} onChange={e=>setMode(e.target.value)}><option value="monthly">شهر كامل: 1 → آخر الشهر</option><option value="cycle">دورة الرواتب: 26 → 25</option><option value="custom">فترة مخصصة</option></select></label>
        {mode!=='custom' && <label>الشهر<input type="month" value={month} onChange={e=>setMonth(e.target.value)} /></label>}
        {mode==='custom' && <><label>من تاريخ<input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} /></label><label>إلى تاريخ<input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} /></label></>}
      </div>
      <div className="actions">
        <button onClick={buildPeriod}>اعتماد الفترة وإنشاء الأيام</button>
        <button className="secondary" onClick={fillStandard}>تعبئة أوقات الوردية القياسية</button>
        <button className="danger" onClick={clearTimes}>مسح الأوقات</button>
      </div>
      <div className="hint">الفترة الحالية: <b>{periodLabel}</b> — الجمعة مستثناة تلقائيًا — 8 ساعات = يوم عمل واحد.</div>
    </section>

    <section className="report-header print-only">
      <h1>كشف دوام الموظف</h1>
      <p><b>الموظف:</b> {employee || '—'} &nbsp; | &nbsp; <b>الوردية:</b> {SHIFTS[shift].label}</p>
      <p><b>الفترة:</b> {periodLabel}</p>
    </section>

    <section className="stats">
      <div><span>إجمالي الحضور</span><strong>{summary.hours}س {summary.mins}د</strong><small>{summary.decimalHours.toFixed(4)} ساعة</small></div>
      <div><span>أيام العمل المكافئة</span><strong>{summary.equivalentDays.toFixed(6)}</strong><small>إجمالي الدقائق ÷ 480</small></div>
      <div><span>أيام مكتملة</span><strong>{summary.complete}</strong><small>من {summary.workDays} يوم عمل</small></div>
      <div><span>أيام الجمعة</span><strong>{summary.fridays}</strong><small>مستثناة من الحساب</small></div>
    </section>

    <section className="card table-card">
      <table>
        <thead><tr><th>#</th><th>التاريخ</th><th>اليوم</th><th>الحضور</th><th>الانصراف</th><th>مدة الحضور</th><th>ما يقابلها أيام</th></tr></thead>
        <tbody>
        {rows.map((r,i)=>{
          const m=workedMinutes(r.checkIn,r.checkOut);
          return <tr key={r.date} className={r.friday?'friday':''}>
            <td>{i+1}</td><td>{r.date}</td><td>{r.day}</td>
            {r.friday ? <td colSpan="4" className="holiday">إجازة الجمعة</td> : <>
              <td><input className="time no-print" type="time" value={r.checkIn} onChange={e=>updateRow(r.date,'checkIn',e.target.value)} /><span className="print-only">{r.checkIn||'—'}</span></td>
              <td><input className="time no-print" type="time" value={r.checkOut} onChange={e=>updateRow(r.date,'checkOut',e.target.value)} /><span className="print-only">{r.checkOut||'—'}</span></td>
              <td>{m?`${Math.floor(m/60)}س ${m%60}د`:'—'}</td><td>{m?(m/480).toFixed(6):'—'}</td>
            </>}
          </tr>
        })}
        {!rows.length && <tr><td colSpan="7" className="empty">اضبط الإعدادات ثم اضغط «اعتماد الفترة وإنشاء الأيام».</td></tr>}
        </tbody>
      </table>
    </section>

    <footer className="no-print">يتم حفظ الإدخالات على هذا الجهاز داخل Local Storage. لا توجد قاعدة بيانات أو حساب مستخدم في هذه النسخة.</footer>
  </main>;
}
