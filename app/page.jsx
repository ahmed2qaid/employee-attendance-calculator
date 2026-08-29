'use client';

import { useEffect, useMemo, useState } from 'react';

const AR_DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const SHIFTS={
  morning:{label:'صباحي 06:00 → 14:00',in:'06:00',out:'14:00'},
  evening:{label:'مسائي 14:00 → 22:00',in:'14:00',out:'22:00'},
  flexible:{label:'مرن / يحدد لكل يوم',in:'',out:''},
};

function pad(n){return String(n).padStart(2,'0')}
function iso(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function fromISO(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function monthParts(s){const[y,m]=s.split('-').map(Number);return{y,m}}
function uid(){return `${Date.now()}-${Math.random().toString(16).slice(2)}`}
function toMin(t){if(!t)return null;const[h,m]=t.split(':').map(Number);return h*60+m}
function workedMinutes(i,o){if(!i||!o)return 0;let a=toMin(i),b=toMin(o);if(b<=a)b+=1440;return b-a}
function periodFrom(mode,month){const{y,m}=monthParts(month);if(mode==='monthly')return{start:new Date(y,m-1,1),end:new Date(y,m,0)};if(mode==='cycle')return{start:new Date(y,m-2,26),end:new Date(y,m-1,25)};return null}
function generateDays(start,end,oldRows={}){const out=[];for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){const key=iso(d),friday=d.getDay()===5;out.push({date:key,day:AR_DAYS[d.getDay()],friday,checkIn:oldRows[key]?.checkIn||'',checkOut:oldRows[key]?.checkOut||''})}return out}
function minLabel(m){return `${Math.floor(m/60)}س ${m%60}د`}

function analyzeRow(r,employee){
  if(r.friday)return{status:'friday',worked:0,late:0,early:0};
  const hasIn=!!r.checkIn,hasOut=!!r.checkOut;
  if(!hasIn&&!hasOut)return{status:'absent',worked:0,late:0,early:0};
  if(!hasIn||!hasOut)return{status:'pending',worked:0,late:0,early:0};
  const worked=workedMinutes(r.checkIn,r.checkOut);
  const shift=SHIFTS[employee?.shift||'morning'];
  if(!shift?.in||!shift?.out)return{status:'present',worked,late:0,early:0};
  let actualIn=toMin(r.checkIn),actualOut=toMin(r.checkOut),scheduledIn=toMin(shift.in),scheduledOut=toMin(shift.out);
  if(scheduledOut<=scheduledIn)scheduledOut+=1440;
  if(actualOut<=actualIn)actualOut+=1440;
  const rawLate=Math.max(0,actualIn-scheduledIn);
  const rawEarly=Math.max(0,scheduledOut-actualOut);
  const lateGrace=Math.max(0,Number(employee?.lateGrace??15)||0);
  const earlyGrace=Math.max(0,Number(employee?.earlyGrace??5)||0);
  return{status:'present',worked,late:rawLate>lateGrace?rawLate:0,early:rawEarly>earlyGrace?rawEarly:0};
}

function summarize(employee){
  let total=0,complete=0,fridays=0,workDays=0,absent=0,pending=0,late=0,early=0;
  for(const r of employee?.rows||[]){const a=analyzeRow(r,employee);if(a.status==='friday'){fridays++;continue}workDays++;if(a.status==='absent'){absent++;continue}if(a.status==='pending'){pending++;continue}complete++;total+=a.worked;late+=a.late;early+=a.early}
  return{total,hours:Math.floor(total/60),mins:total%60,decimalHours:total/60,equivalentDays:total/480,complete,fridays,workDays,absent,pending,late,early};
}

function Status({a}){if(a.status==='absent')return <span className="badge danger-badge">غياب</span>;if(a.status==='pending')return <span className="badge warning">معلق</span>;if(a.late||a.early)return <span className="badge warning">حضور بملاحظة</span>;return <span className="badge success">حضور</span>}

export default function Home(){
  const[employees,setEmployees]=useState([]),[activeId,setActiveId]=useState(''),[newName,setNewName]=useState('');
  const[mode,setMode]=useState('cycle'),[month,setMonth]=useState('2026-08'),[customStart,setCustomStart]=useState('2026-07-26'),[customEnd,setCustomEnd]=useState('2026-08-25');
  const[defaultLateGrace,setDefaultLateGrace]=useState(15),[defaultEarlyGrace,setDefaultEarlyGrace]=useState(5),[loaded,setLoaded]=useState(false),[view,setView]=useState('employee');

  useEffect(()=>{try{const raw=localStorage.getItem('attendance-nextjs-standalone-v3');if(raw){const s=JSON.parse(raw);setEmployees(s.employees||[]);setActiveId(s.activeId||s.employees?.[0]?.id||'');setMode(s.mode||'cycle');setMonth(s.month||'2026-08');setCustomStart(s.customStart||'2026-07-26');setCustomEnd(s.customEnd||'2026-08-25');setDefaultLateGrace(s.defaultLateGrace??15);setDefaultEarlyGrace(s.defaultEarlyGrace??5)}}finally{setLoaded(true)}},[]);
  useEffect(()=>{if(loaded)localStorage.setItem('attendance-nextjs-standalone-v3',JSON.stringify({employees,activeId,mode,month,customStart,customEnd,defaultLateGrace,defaultEarlyGrace}))},[loaded,employees,activeId,mode,month,customStart,customEnd,defaultLateGrace,defaultEarlyGrace]);

  const active=employees.find(e=>e.id===activeId)||employees[0]||null;
  const effectivePeriod=useMemo(()=>mode==='custom'?{start:fromISO(customStart),end:fromISO(customEnd)}:periodFrom(mode,month),[mode,month,customStart,customEnd]);
  const periodLabel=active?.rows?.length?`${active.rows[0].date} → ${active.rows.at(-1).date}`:'لم يتم إنشاء الأيام بعد';

  function addEmployee(){const name=newName.trim();if(!name)return alert('أدخل اسم الموظف.');const id=uid();setEmployees(p=>[...p,{id,name,shift:'morning',lateGrace:Number(defaultLateGrace)||0,earlyGrace:Number(defaultEarlyGrace)||0,rows:[]}]);setActiveId(id);setNewName('')}
  function updateEmployee(id,patch){setEmployees(p=>p.map(e=>e.id===id?{...e,...patch}:e))}
  function removeEmployee(id){const x=employees.find(e=>e.id===id);if(!x||!confirm(`حذف ${x.name} وكل بياناته؟`))return;setEmployees(p=>p.filter(e=>e.id!==id));if(activeId===id)setActiveId(employees.find(e=>e.id!==id)?.id||'')}
  function buildForAll(){if(!effectivePeriod||effectivePeriod.end<effectivePeriod.start)return alert('تحقق من الفترة.');setEmployees(p=>p.map(e=>{const old=Object.fromEntries((e.rows||[]).map(r=>[r.date,r]));return{...e,rows:generateDays(effectivePeriod.start,effectivePeriod.end,old)}}))}
  function buildForOne(){if(!active)return;if(!effectivePeriod||effectivePeriod.end<effectivePeriod.start)return alert('تحقق من الفترة.');setEmployees(p=>p.map(e=>{if(e.id!==active.id)return e;const old=Object.fromEntries((e.rows||[]).map(r=>[r.date,r]));return{...e,rows:generateDays(effectivePeriod.start,effectivePeriod.end,old)}}))}
  function updateRow(date,field,value){if(!active)return;setEmployees(p=>p.map(e=>e.id!==active.id?e:{...e,rows:e.rows.map(r=>r.date===date?{...r,[field]:value}:r)}))}
  function fillStandard(){if(!active)return;const s=SHIFTS[active.shift];if(!s.in)return alert('اختر وردية صباحية أو مسائية.');setEmployees(p=>p.map(e=>e.id!==active.id?e:{...e,rows:e.rows.map(r=>r.friday?r:{...r,checkIn:s.in,checkOut:s.out})}))}
  function clearTimes(){if(active&&confirm('مسح كل أوقات هذا الموظف؟'))setEmployees(p=>p.map(e=>e.id!==active.id?e:{...e,rows:e.rows.map(r=>({...r,checkIn:'',checkOut:''}))}))}
  function applyDefaultsToAll(){setEmployees(p=>p.map(e=>({...e,lateGrace:Number(defaultLateGrace)||0,earlyGrace:Number(defaultEarlyGrace)||0})))}

  const summary=useMemo(()=>summarize(active),[active]);
  const totals=useMemo(()=>employees.map(employee=>({employee,summary:summarize(employee)})),[employees]);
  const grand=useMemo(()=>totals.reduce((g,x)=>({minutes:g.minutes+x.summary.total,days:g.days+x.summary.equivalentDays,absent:g.absent+x.summary.absent,pending:g.pending+x.summary.pending,late:g.late+x.summary.late,early:g.early+x.summary.early}),{minutes:0,days:0,absent:0,pending:0,late:0,early:0}),[totals]);

  return <main>
    <section className="hero no-print"><div><span className="eyebrow">Next.js Standalone · Configurable Policy</span><h1>حاسبة دوام الموظفين</h1><p>سياسة الدوام قابلة للتهيئة عالميًا ولكل موظف على حدة.</p></div><div className="actions top-actions"><button className={view==='employee'?'active-tab':'secondary'} onClick={()=>setView('employee')}>كشف الموظف</button><button className={view==='summary'?'active-tab':'secondary'} onClick={()=>setView('summary')}>التقرير الإجمالي</button><button className="pdf" onClick={()=>window.print()}>تصدير / حفظ PDF</button></div></section>

    <section className="card settings no-print"><div className="section-head"><h2>إعدادات التهيئة العامة</h2><span>{employees.length} موظف</span></div><div className="grid"><label>سماح التأخير الافتراضي (دقيقة)<input type="number" min="0" value={defaultLateGrace} onChange={e=>setDefaultLateGrace(e.target.value)}/></label><label>سماح الانصراف المبكر الافتراضي (دقيقة)<input type="number" min="0" value={defaultEarlyGrace} onChange={e=>setDefaultEarlyGrace(e.target.value)}/></label><label>إضافة موظف<div className="inline"><input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addEmployee()} placeholder="اسم الموظف"/><button onClick={addEmployee}>إضافة</button></div></label><label>طريقة الفترة<select value={mode} onChange={e=>setMode(e.target.value)}><option value="monthly">شهر كامل</option><option value="cycle">دورة 26 → 25</option><option value="custom">فترة مخصصة</option></select></label>{mode!=='custom'?<label>الشهر<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>:<><label>من<input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)}/></label><label>إلى<input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)}/></label></>}</div><div className="actions"><button onClick={buildForAll}>إنشاء/تحديث الفترة لكل الموظفين</button><button className="secondary" onClick={applyDefaultsToAll}>تطبيق السماحات الافتراضية على الجميع</button></div><div className="policy-note">الموظف الجديد يرث القيم الافتراضية الحالية. بعد إضافته يمكنك تغيير سماحاته بشكل مستقل.</div><div className="employees-list">{employees.map(e=><button key={e.id} className={`employee-chip ${e.id===activeId?'selected':''}`} onClick={()=>{setActiveId(e.id);setView('employee')}}><span>{e.name}</span><small>{SHIFTS[e.shift].label} · تأخير {e.lateGrace??15}د · مبكر {e.earlyGrace??5}د</small></button>)}</div></section>

    {view==='employee'&&<>{active?<><section className="card no-print"><div className="employee-toolbar"><div><h2>{active.name}</h2><p>الفترة: <b>{periodLabel}</b></p></div><div className="employee-controls"><div className="grid employee-policy-grid"><label>نوع الدوام<select value={active.shift} onChange={e=>updateEmployee(active.id,{shift:e.target.value})}>{Object.entries(SHIFTS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><label>سماح التأخير لهذا الموظف (دقيقة)<input type="number" min="0" value={active.lateGrace??15} onChange={e=>updateEmployee(active.id,{lateGrace:Number(e.target.value)||0})}/></label><label>سماح الانصراف المبكر لهذا الموظف (دقيقة)<input type="number" min="0" value={active.earlyGrace??5} onChange={e=>updateEmployee(active.id,{earlyGrace:Number(e.target.value)||0})}/></label></div><div className="actions"><button onClick={buildForOne}>إنشاء/تحديث الأيام</button><button className="secondary" onClick={fillStandard}>تعبئة الوردية</button><button className="danger" onClick={clearTimes}>مسح الأوقات</button><button className="ghost-danger" onClick={()=>removeEmployee(active.id)}>حذف الموظف</button></div></div></div></section>

    <section className="report-header print-only"><h1>كشف دوام الموظف</h1><p><b>الموظف:</b> {active.name} | <b>الوردية:</b> {SHIFTS[active.shift].label} | <b>الفترة:</b> {periodLabel}</p><p><b>سماح التأخير:</b> {active.lateGrace??15} دقيقة | <b>سماح الانصراف المبكر:</b> {active.earlyGrace??5} دقيقة</p></section>
    <section className="stats policy-stats"><div><span>إجمالي الحضور</span><strong>{summary.hours}س {summary.mins}د</strong><small>{summary.decimalHours.toFixed(4)} ساعة</small></div><div><span>أيام العمل المكافئة</span><strong>{summary.equivalentDays.toFixed(6)}</strong><small>الدقائق ÷ 480</small></div><div><span>الغياب</span><strong>{summary.absent}</strong><small>أيام بلا بصمة</small></div><div><span>الأيام المعلقة</span><strong>{summary.pending}</strong><small>بصمة ناقصة</small></div><div><span>التأخير</span><strong>{minLabel(summary.late)}</strong><small>حسب سماح الموظف</small></div><div><span>الانصراف المبكر</span><strong>{minLabel(summary.early)}</strong><small>حسب سماح الموظف</small></div></section>
    <section className="card table-card"><table><thead><tr><th>#</th><th>التاريخ</th><th>اليوم</th><th>الحضور</th><th>الانصراف</th><th>ساعات الحضور</th><th>التأخير</th><th>مبكر</th><th>الحالة</th><th>أيام</th></tr></thead><tbody>{(active.rows||[]).map((r,i)=>{const a=analyzeRow(r,active);return <tr key={r.date} className={r.friday?'friday':''}><td>{i+1}</td><td>{r.date}</td><td>{r.day}</td>{r.friday?<td colSpan="7" className="holiday">إجازة الجمعة</td>:<><td><input className="time no-print" type="time" value={r.checkIn} onChange={e=>updateRow(r.date,'checkIn',e.target.value)}/><span className="print-only">{r.checkIn||'—'}</span></td><td><input className="time no-print" type="time" value={r.checkOut} onChange={e=>updateRow(r.date,'checkOut',e.target.value)}/><span className="print-only">{r.checkOut||'—'}</span></td><td>{a.worked?minLabel(a.worked):'—'}</td><td>{a.late?`${a.late}د`:'—'}</td><td>{a.early?`${a.early}د`:'—'}</td><td><Status a={a}/></td><td>{a.worked?(a.worked/480).toFixed(6):'—'}</td></>}</tr>})}</tbody></table></section></>:<section className="card empty-state">أضف موظفًا للبدء.</section>}</>}

    {view==='summary'&&<><section className="report-header print-only"><h1>التقرير الإجمالي للموظفين</h1></section><section className="stats summary-stats"><div><span>إجمالي ساعات الجميع</span><strong>{minLabel(grand.minutes)}</strong></div><div><span>إجمالي أيام العمل المكافئة</span><strong>{grand.days.toFixed(6)}</strong></div><div><span>إجمالي الغياب</span><strong>{grand.absent}</strong></div><div><span>إجمالي المعلق</span><strong>{grand.pending}</strong></div><div><span>إجمالي التأخير</span><strong>{minLabel(grand.late)}</strong></div><div><span>إجمالي الانصراف المبكر</span><strong>{minLabel(grand.early)}</strong></div></section><section className="card table-card"><table><thead><tr><th>#</th><th>الموظف</th><th>الوردية</th><th>سماح التأخير</th><th>سماح المبكر</th><th>الساعات</th><th>الأيام</th><th>الغياب</th><th>المعلق</th><th>التأخير</th><th>مبكر</th></tr></thead><tbody>{totals.map((x,i)=><tr key={x.employee.id}><td>{i+1}</td><td className="name-cell">{x.employee.name}</td><td>{SHIFTS[x.employee.shift].label}</td><td>{x.employee.lateGrace??15}د</td><td>{x.employee.earlyGrace??5}د</td><td>{minLabel(x.summary.total)}</td><td>{x.summary.equivalentDays.toFixed(6)}</td><td>{x.summary.absent}</td><td>{x.summary.pending}</td><td>{minLabel(x.summary.late)}</td><td>{minLabel(x.summary.early)}</td></tr>)}</tbody></table></section></>}
    <footer className="no-print">كل إعدادات الموظفين والسماحات والفترات محفوظة محليًا في Local Storage.</footer>
  </main>;
}
