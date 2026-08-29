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
function uid(){ return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

function periodFrom(mode, month){
  const { y, m } = monthParts(month);
  if(mode === 'monthly') return { start: new Date(y,m-1,1), end: new Date(y,m,0) };
  if(mode === 'cycle') return { start: new Date(y,m-2,26), end: new Date(y,m-1,25) };
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

function summarize(rows){
  let total=0, complete=0, fridays=0, workDays=0;
  for(const r of rows){
    if(r.friday){fridays++;continue;}
    workDays++;
    if(r.checkIn && r.checkOut){ total+=workedMinutes(r.checkIn,r.checkOut); complete++; }
  }
  return { total, hours:Math.floor(total/60), mins:total%60, decimalHours:total/60, equivalentDays:total/480, complete, fridays, workDays };
}

export default function Home(){
  const [employees,setEmployees]=useState([]);
  const [activeId,setActiveId]=useState('');
  const [newName,setNewName]=useState('');
  const [mode,setMode]=useState('cycle');
  const [month,setMonth]=useState('2026-08');
  const [customStart,setCustomStart]=useState('2026-07-26');
  const [customEnd,setCustomEnd]=useState('2026-08-25');
  const [loaded,setLoaded]=useState(false);
  const [view,setView]=useState('employee');

  useEffect(()=>{
    try{
      const raw=localStorage.getItem('attendance-nextjs-standalone-v2');
      if(raw){
        const s=JSON.parse(raw);
        setEmployees(s.employees || []);
        setActiveId(s.activeId || s.employees?.[0]?.id || '');
        setMode(s.mode || 'cycle');
        setMonth(s.month || '2026-08');
        setCustomStart(s.customStart || '2026-07-26');
        setCustomEnd(s.customEnd || '2026-08-25');
      }
    } finally { setLoaded(true); }
  },[]);

  useEffect(()=>{
    if(!loaded) return;
    localStorage.setItem('attendance-nextjs-standalone-v2', JSON.stringify({employees,activeId,mode,month,customStart,customEnd}));
  },[loaded,employees,activeId,mode,month,customStart,customEnd]);

  const active = employees.find(e=>e.id===activeId) || employees[0] || null;

  const effectivePeriod=useMemo(()=>{
    if(mode==='custom') return {start:fromISO(customStart),end:fromISO(customEnd)};
    return periodFrom(mode,month);
  },[mode,month,customStart,customEnd]);

  function addEmployee(){
    const name=newName.trim();
    if(!name) return alert('أدخل اسم الموظف.');
    const id=uid();
    const employee={id,name,shift:'morning',rows:[]};
    setEmployees(prev=>[...prev,employee]);
    setActiveId(id);
    setNewName('');
  }

  function removeEmployee(id){
    const target=employees.find(e=>e.id===id);
    if(!target || !confirm(`حذف الموظف ${target.name} وكل بياناته المحفوظة؟`)) return;
    setEmployees(prev=>prev.filter(e=>e.id!==id));
    if(activeId===id){
      const next=employees.find(e=>e.id!==id);
      setActiveId(next?.id || '');
    }
  }

  function updateEmployee(id,patch){
    setEmployees(prev=>prev.map(e=>e.id===id?{...e,...patch}:e));
  }

  function buildPeriodFor(employeeId=activeId){
    if(!effectivePeriod || effectivePeriod.end < effectivePeriod.start) return alert('تحقق من الفترة المحددة.');
    setEmployees(prev=>prev.map(e=>{
      if(e.id!==employeeId) return e;
      const old=Object.fromEntries((e.rows||[]).map(r=>[r.date,r]));
      return {...e,rows:generateDays(effectivePeriod.start,effectivePeriod.end,old)};
    }));
  }

  function buildPeriodForAll(){
    if(!effectivePeriod || effectivePeriod.end < effectivePeriod.start) return alert('تحقق من الفترة المحددة.');
    setEmployees(prev=>prev.map(e=>{
      const old=Object.fromEntries((e.rows||[]).map(r=>[r.date,r]));
      return {...e,rows:generateDays(effectivePeriod.start,effectivePeriod.end,old)};
    }));
  }

  function updateRow(date,field,value){
    if(!active) return;
    setEmployees(prev=>prev.map(e=>e.id!==active.id?e:{...e,rows:e.rows.map(r=>r.date===date?{...r,[field]:value}:r)}));
  }

  function fillStandard(){
    if(!active) return;
    const s=SHIFTS[active.shift];
    if(!s.in) return alert('اختر وردية صباحية أو مسائية أولًا.');
    setEmployees(prev=>prev.map(e=>e.id!==active.id?e:{...e,rows:e.rows.map(r=>r.friday?r:{...r,checkIn:s.in,checkOut:s.out})}));
  }

  function clearTimes(){
    if(!active || !confirm('مسح كل أوقات الحضور والانصراف لهذا الموظف؟')) return;
    setEmployees(prev=>prev.map(e=>e.id!==active.id?e:{...e,rows:e.rows.map(r=>({...r,checkIn:'',checkOut:''}))}));
  }

  const summary=useMemo(()=>summarize(active?.rows || []),[active]);
  const totals=useMemo(()=>employees.map(e=>({employee:e,summary:summarize(e.rows||[])})),[employees]);
  const grand=useMemo(()=>{
    const total=totals.reduce((a,x)=>a+x.summary.total,0);
    return {total,hours:Math.floor(total/60),mins:total%60,equivalentDays:total/480};
  },[totals]);

  const periodLabel = active?.rows?.length ? `${active.rows[0].date} → ${active.rows[active.rows.length-1].date}` : 'لم يتم إنشاء الأيام بعد';

  return <main>
    <section className="hero no-print">
      <div>
        <span className="eyebrow">Next.js Standalone · Multi Employee</span>
        <h1>حاسبة دوام الموظفين</h1>
        <p>عدة موظفين، حساب لحظي، حفظ محلي، تقرير إجمالي، وتصدير PDF.</p>
      </div>
      <div className="actions top-actions">
        <button className={view==='employee'?'active-tab':'secondary'} onClick={()=>setView('employee')}>كشف الموظف</button>
        <button className={view==='summary'?'active-tab':'secondary'} onClick={()=>setView('summary')}>التقرير الإجمالي</button>
        <button className="pdf" onClick={()=>window.print()}>تصدير / حفظ PDF</button>
      </div>
    </section>

    <section className="card settings no-print">
      <div className="section-head"><h2>إعداد الفترة والموظفين</h2><span>{employees.length} موظف</span></div>
      <div className="grid">
        <label>إضافة موظف<div className="inline"><input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addEmployee()} placeholder="اسم الموظف"/><button onClick={addEmployee}>إضافة</button></div></label>
        <label>طريقة الفترة<select value={mode} onChange={e=>setMode(e.target.value)}><option value="monthly">شهر كامل: 1 → آخر الشهر</option><option value="cycle">دورة الرواتب: 26 → 25</option><option value="custom">فترة مخصصة</option></select></label>
        {mode!=='custom' && <label>الشهر<input type="month" value={month} onChange={e=>setMonth(e.target.value)} /></label>}
        {mode==='custom' && <><label>من تاريخ<input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} /></label><label>إلى تاريخ<input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} /></label></>}
      </div>
      <div className="actions"><button onClick={buildPeriodForAll}>إنشاء/تحديث الفترة لكل الموظفين</button></div>
      <div className="employees-list">
        {employees.map(e=><button key={e.id} className={`employee-chip ${e.id===activeId?'selected':''}`} onClick={()=>{setActiveId(e.id);setView('employee')}}><span>{e.name}</span><small>{SHIFTS[e.shift].label}</small></button>)}
        {!employees.length && <div className="empty-inline">أضف الموظف الأول للبدء.</div>}
      </div>
    </section>

    {view==='employee' && <>
      {active ? <>
        <section className="card no-print">
          <div className="employee-toolbar">
            <div><h2>{active.name}</h2><p>الفترة الحالية: <b>{periodLabel}</b></p></div>
            <div className="employee-controls">
              <label>نوع الدوام<select value={active.shift} onChange={e=>updateEmployee(active.id,{shift:e.target.value})}>{Object.entries(SHIFTS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label>
              <div className="actions"><button onClick={()=>buildPeriodFor(active.id)}>إنشاء/تحديث الأيام</button><button className="secondary" onClick={fillStandard}>تعبئة الوردية</button><button className="danger" onClick={clearTimes}>مسح الأوقات</button><button className="ghost-danger" onClick={()=>removeEmployee(active.id)}>حذف الموظف</button></div>
            </div>
          </div>
        </section>

        <section className="report-header print-only"><h1>كشف دوام الموظف</h1><p><b>الموظف:</b> {active.name} &nbsp; | &nbsp; <b>الوردية:</b> {SHIFTS[active.shift].label}</p><p><b>الفترة:</b> {periodLabel}</p></section>

        <section className="stats">
          <div><span>إجمالي الحضور</span><strong>{summary.hours}س {summary.mins}د</strong><small>{summary.decimalHours.toFixed(4)} ساعة</small></div>
          <div><span>أيام العمل المكافئة</span><strong>{summary.equivalentDays.toFixed(6)}</strong><small>إجمالي الدقائق ÷ 480</small></div>
          <div><span>أيام مكتملة</span><strong>{summary.complete}</strong><small>من {summary.workDays} يوم عمل</small></div>
          <div><span>أيام الجمعة</span><strong>{summary.fridays}</strong><small>مستثناة من الحساب</small></div>
        </section>

        <section className="card table-card"><table><thead><tr><th>#</th><th>التاريخ</th><th>اليوم</th><th>الحضور</th><th>الانصراف</th><th>مدة الحضور</th><th>ما يقابلها أيام</th></tr></thead><tbody>
          {(active.rows||[]).map((r,i)=>{const m=workedMinutes(r.checkIn,r.checkOut);return <tr key={r.date} className={r.friday?'friday':''}><td>{i+1}</td><td>{r.date}</td><td>{r.day}</td>{r.friday?<td colSpan="4" className="holiday">إجازة الجمعة</td>:<><td><input className="time no-print" type="time" value={r.checkIn} onChange={e=>updateRow(r.date,'checkIn',e.target.value)}/><span className="print-only">{r.checkIn||'—'}</span></td><td><input className="time no-print" type="time" value={r.checkOut} onChange={e=>updateRow(r.date,'checkOut',e.target.value)}/><span className="print-only">{r.checkOut||'—'}</span></td><td>{m?`${Math.floor(m/60)}س ${m%60}د`:'—'}</td><td>{m?(m/480).toFixed(6):'—'}</td></>}</tr>})}
          {!(active.rows||[]).length && <tr><td colSpan="7" className="empty">اضغط «إنشاء/تحديث الأيام» لبدء إدخال الدوام.</td></tr>}
        </tbody></table></section>
      </> : <section className="card empty-state">أضف موظفًا للبدء.</section>}
    </>}

    {view==='summary' && <>
      <section className="report-header print-only"><h1>التقرير الإجمالي للموظفين</h1><p><b>عدد الموظفين:</b> {employees.length}</p></section>
      <section className="stats summary-stats"><div><span>إجمالي ساعات الجميع</span><strong>{grand.hours}س {grand.mins}د</strong></div><div><span>إجمالي أيام العمل المكافئة</span><strong>{grand.equivalentDays.toFixed(6)}</strong></div></section>
      <section className="card table-card"><table><thead><tr><th>#</th><th>الموظف</th><th>الوردية</th><th>الفترة</th><th>الساعات</th><th>الأيام المكافئة</th><th>الأيام المكتملة</th><th>الجمعة</th></tr></thead><tbody>
        {totals.map((x,i)=>{const rows=x.employee.rows||[]; const p=rows.length?`${rows[0].date} → ${rows[rows.length-1].date}`:'—'; return <tr key={x.employee.id}><td>{i+1}</td><td className="name-cell">{x.employee.name}</td><td>{SHIFTS[x.employee.shift].label}</td><td>{p}</td><td>{x.summary.hours}س {x.summary.mins}د</td><td>{x.summary.equivalentDays.toFixed(6)}</td><td>{x.summary.complete}/{x.summary.workDays}</td><td>{x.summary.fridays}</td></tr>})}
        {!totals.length && <tr><td colSpan="8" className="empty">لا يوجد موظفون بعد.</td></tr>}
      </tbody></table></section>
    </>}

    <footer className="no-print">كل البيانات محفوظة محليًا في هذا المتصفح فقط. لا توجد قاعدة بيانات أو حساب مستخدم في هذه النسخة.</footer>
  </main>;
}
