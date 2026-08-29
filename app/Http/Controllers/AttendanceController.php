<?php
namespace App\Http\Controllers;
use App\Models\Attendance;
use App\Models\Employee;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
class AttendanceController extends Controller {
 public function index(): View { return view('attendance.index',['employees'=>Employee::orderBy('name')->get()]); }
 public function sheet(Request $request): View {
  $v=$request->validate(['employee_id'=>['required','exists:employees,id'],'start_date'=>['required','date'],'end_date'=>['required','date','after_or_equal:start_date']]);
  $employee=Employee::findOrFail($v['employee_id']); $start=Carbon::parse($v['start_date'])->startOfDay(); $end=Carbon::parse($v['end_date'])->startOfDay();
  abort_if($start->diffInDays($end)>370,422,'الحد الأقصى للفترة 371 يومًا.');
  $stored=Attendance::where('employee_id',$employee->id)->whereBetween('work_date',[$start->toDateString(),$end->toDateString()])->get()->keyBy(fn($r)=>$r->work_date->format('Y-m-d'));
  $days=[]; foreach(CarbonPeriod::create($start,$end) as $date){ $key=$date->format('Y-m-d'); $a=$stored->get($key); $fri=$date->isFriday(); $analysis=$this->analyze($date,$a,$employee); $days[]=['date'=>$date->copy(),'key'=>$key,'is_friday'=>$fri,'attendance'=>$a]+$analysis; }
  $summary=$this->summary($days); return view('attendance.sheet',compact('employee','start','end','days','summary'));
 }
 public function save(Request $request): RedirectResponse {
  $v=$request->validate(['employee_id'=>['required','exists:employees,id'],'start_date'=>['required','date'],'end_date'=>['required','date','after_or_equal:start_date'],'shift_type'=>['required','in:morning,evening,flexible'],'late_grace'=>['required','integer','min:0'],'early_grace'=>['required','integer','min:0'],'rows'=>['nullable','array'],'rows.*.check_in'=>['nullable','date_format:H:i'],'rows.*.check_out'=>['nullable','date_format:H:i']]);
  $employee=Employee::findOrFail($v['employee_id']); $employee->update(['shift_type'=>$v['shift_type'],'late_grace'=>$v['late_grace'],'early_grace'=>$v['early_grace']]);
  $start=Carbon::parse($v['start_date'])->startOfDay(); $end=Carbon::parse($v['end_date'])->startOfDay();
  foreach($v['rows']??[] as $ds=>$row){ try{$date=Carbon::createFromFormat('Y-m-d',$ds)->startOfDay();}catch(\Throwable $e){continue;} if($date->lt($start)||$date->gt($end)||$date->isFriday()) continue; $in=$row['check_in']??null; $out=$row['check_out']??null; if(!$in&&!$out){ Attendance::where('employee_id',$v['employee_id'])->whereDate('work_date',$ds)->delete(); continue; } Attendance::updateOrCreate(['employee_id'=>$v['employee_id'],'work_date'=>$ds],['check_in'=>$in?:null,'check_out'=>$out?:null]); }
  return redirect()->route('attendance.sheet',['employee_id'=>$v['employee_id'],'start_date'=>$v['start_date'],'end_date'=>$v['end_date']])->with('success','تم حفظ الدوام وسياسة السماح وإعادة الحساب.');
 }
 private function workedMinutes(string $date,string $checkIn,string $checkOut): int { $in=Carbon::parse("$date $checkIn"); $out=Carbon::parse("$date $checkOut"); if($out->lte($in)) $out->addDay(); return (int)$in->diffInMinutes($out); }
 private function analyze(Carbon $date, ?Attendance $a, Employee $employee): array {
  if($date->isFriday()) return ['minutes'=>0,'status'=>'friday','late'=>0,'early'=>0];
  if(!$a?->check_in && !$a?->check_out) return ['minutes'=>0,'status'=>'absent','late'=>0,'early'=>0];
  if(!$a?->check_in || !$a?->check_out) return ['minutes'=>0,'status'=>'pending','late'=>0,'early'=>0];
  $minutes=$this->workedMinutes($date->format('Y-m-d'),$a->check_in,$a->check_out);
  if($employee->shift_type==='flexible') return ['minutes'=>$minutes,'status'=>'present','late'=>0,'early'=>0];
  $scheduledIn=$employee->shift_type==='evening'?'14:00':'06:00'; $scheduledOut=$employee->shift_type==='evening'?'22:00':'14:00';
  $actualIn=Carbon::parse($date->format('Y-m-d').' '.$a->check_in); $actualOut=Carbon::parse($date->format('Y-m-d').' '.$a->check_out); $sIn=Carbon::parse($date->format('Y-m-d').' '.$scheduledIn); $sOut=Carbon::parse($date->format('Y-m-d').' '.$scheduledOut); if($actualOut->lte($actualIn))$actualOut->addDay();
  $rawLate=$actualIn->gt($sIn)?$sIn->diffInMinutes($actualIn):0; $rawEarly=$actualOut->lt($sOut)?$actualOut->diffInMinutes($sOut):0;
  return ['minutes'=>$minutes,'status'=>'present','late'=>$rawLate>$employee->late_grace?$rawLate:0,'early'=>$rawEarly>$employee->early_grace?$rawEarly:0];
 }
 private function summary(array $days): array { $total=0;$complete=0;$pending=0;$absent=0;$fridays=0;$workDays=0;$late=0;$early=0; foreach($days as $d){ if($d['status']==='friday'){$fridays++;continue;} $workDays++; if($d['status']==='absent'){$absent++;continue;} if($d['status']==='pending'){$pending++;continue;} $complete++;$total+=$d['minutes'];$late+=$d['late'];$early+=$d['early']; } return ['total_minutes'=>$total,'hours_whole'=>intdiv($total,60),'minutes_remainder'=>$total%60,'decimal_hours'=>$total/60,'equivalent_days'=>$total/480,'complete_days'=>$complete,'pending_days'=>$pending,'absent_days'=>$absent,'fridays'=>$fridays,'calendar_work_days'=>$workDays,'late_minutes'=>$late,'early_minutes'=>$early]; }
}
