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
  if(!$employee->rotation_start)$employee->rotation_start=$start->toDateString();
  $stored=Attendance::where('employee_id',$employee->id)->whereBetween('work_date',[$start->toDateString(),$end->toDateString()])->get()->keyBy(fn($r)=>$r->work_date->format('Y-m-d'));
  $days=[]; foreach(CarbonPeriod::create($start,$end) as $date){ $key=$date->format('Y-m-d'); $a=$stored->get($key); $days[]=['date'=>$date->copy(),'key'=>$key,'is_friday'=>$date->isFriday(),'attendance'=>$a]+$this->analyze($date,$a,$employee); }
  $summary=$this->summary($days); $lateGrace=(int)config('attendance.default_late_grace',15); $earlyGrace=(int)config('attendance.default_early_grace',5); return view('attendance.sheet',compact('employee','start','end','days','summary','lateGrace','earlyGrace'));
 }
 public function save(Request $request): RedirectResponse {
  $v=$request->validate(['employee_id'=>['required','exists:employees,id'],'start_date'=>['required','date'],'end_date'=>['required','date','after_or_equal:start_date'],'shift_mode'=>['required','in:single,dual'],'shift_one'=>['required','in:morning,evening'],'shift_two'=>['required','in:morning,evening'],'rotation_start'=>['required','date'],'rows'=>['nullable','array'],'rows.*.check_in'=>['nullable','date_format:H:i'],'rows.*.check_out'=>['nullable','date_format:H:i']]);
  $employee=Employee::findOrFail($v['employee_id']); $employee->update(['shift_mode'=>$v['shift_mode'],'shift_one'=>$v['shift_one'],'shift_two'=>$v['shift_two'],'rotation_start'=>$v['rotation_start']]);
  $start=Carbon::parse($v['start_date'])->startOfDay(); $end=Carbon::parse($v['end_date'])->startOfDay();
  foreach($v['rows']??[] as $ds=>$row){ try{$date=Carbon::createFromFormat('Y-m-d',$ds)->startOfDay();}catch(\Throwable $e){continue;} if($date->lt($start)||$date->gt($end)||$date->isFriday()) continue; $in=$row['check_in']??null; $out=$row['check_out']??null; if(!$in&&!$out){ Attendance::where('employee_id',$v['employee_id'])->whereDate('work_date',$ds)->delete(); continue; } Attendance::updateOrCreate(['employee_id'=>$v['employee_id'],'work_date'=>$ds],['check_in'=>$in?:null,'check_out'=>$out?:null]); }
  return redirect()->route('attendance.sheet',['employee_id'=>$v['employee_id'],'start_date'=>$v['start_date'],'end_date'=>$v['end_date']])->with('success','تم حفظ الدوام ونظام الورديات وإعادة الحساب.');
 }
 private function workedMinutes(string $date,string $checkIn,string $checkOut): int { $in=Carbon::parse("$date $checkIn"); $out=Carbon::parse("$date $checkOut"); if($out->lte($in)) $out->addDay(); return (int)$in->diffInMinutes($out); }
 private function shiftForDate(Carbon $date, Employee $employee): array {
  $type=$employee->shift_one ?: 'morning';
  if(($employee->shift_mode?:'single')==='dual'){
   $anchor=Carbon::parse($employee->rotation_start ?: $date->toDateString())->startOfDay();
   $days=$anchor->diffInDays($date,false); $week=(int)floor($days/7); $odd=((($week%2)+2)%2)===1;
   if($odd)$type=$employee->shift_two ?: 'evening';
  }
  return $type==='evening'?['type'=>'evening','label'=>'مسائي','in'=>'14:00','out'=>'22:00']:['type'=>'morning','label'=>'صباحي','in'=>'06:00','out'=>'14:00'];
 }
 private function analyze(Carbon $date, ?Attendance $a, Employee $employee): array {
  $shift=$this->shiftForDate($date,$employee);
  if($date->isFriday()) return ['minutes'=>0,'status'=>'friday','late'=>0,'early'=>0,'shift'=>$shift];
  if(!$a?->check_in && !$a?->check_out) return ['minutes'=>0,'status'=>'absent','late'=>0,'early'=>0,'shift'=>$shift];
  if(!$a?->check_in || !$a?->check_out) return ['minutes'=>0,'status'=>'pending','late'=>0,'early'=>0,'shift'=>$shift];
  $minutes=$this->workedMinutes($date->format('Y-m-d'),$a->check_in,$a->check_out);
  $actualIn=Carbon::parse($date->format('Y-m-d').' '.$a->check_in); $actualOut=Carbon::parse($date->format('Y-m-d').' '.$a->check_out); $sIn=Carbon::parse($date->format('Y-m-d').' '.$shift['in']); $sOut=Carbon::parse($date->format('Y-m-d').' '.$shift['out']); if($actualOut->lte($actualIn))$actualOut->addDay();
  $rawLate=$actualIn->gt($sIn)?$sIn->diffInMinutes($actualIn):0; $rawEarly=$actualOut->lt($sOut)?$actualOut->diffInMinutes($sOut):0; $lateGrace=(int)config('attendance.default_late_grace',15); $earlyGrace=(int)config('attendance.default_early_grace',5);
  return ['minutes'=>$minutes,'status'=>'present','late'=>$rawLate>$lateGrace?$rawLate:0,'early'=>$rawEarly>$earlyGrace?$rawEarly:0,'shift'=>$shift];
 }
 private function summary(array $days): array { $total=0;$complete=0;$pending=0;$absent=0;$fridays=0;$workDays=0;$late=0;$early=0; foreach($days as $d){ if($d['status']==='friday'){$fridays++;continue;} $workDays++; if($d['status']==='absent'){$absent++;continue;} if($d['status']==='pending'){$pending++;continue;} $complete++;$total+=$d['minutes'];$late+=$d['late'];$early+=$d['early']; } return ['total_minutes'=>$total,'hours_whole'=>intdiv($total,60),'minutes_remainder'=>$total%60,'decimal_hours'=>$total/60,'equivalent_days'=>$total/480,'complete_days'=>$complete,'pending_days'=>$pending,'absent_days'=>$absent,'fridays'=>$fridays,'calendar_work_days'=>$workDays,'late_minutes'=>$late,'early_minutes'=>$early]; }
}
