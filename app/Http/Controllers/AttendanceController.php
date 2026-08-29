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
  $days=[]; foreach(CarbonPeriod::create($start,$end) as $date){ $key=$date->format('Y-m-d'); $a=$stored->get($key); $fri=$date->isFriday(); $minutes=(!$fri && $a?->check_in && $a?->check_out)?$this->workedMinutes($key,$a->check_in,$a->check_out):0; $days[]=['date'=>$date->copy(),'key'=>$key,'is_friday'=>$fri,'attendance'=>$a,'minutes'=>$minutes]; }
  $summary=$this->summary($days); return view('attendance.sheet',compact('employee','start','end','days','summary'));
 }
 public function save(Request $request): RedirectResponse {
  $v=$request->validate(['employee_id'=>['required','exists:employees,id'],'start_date'=>['required','date'],'end_date'=>['required','date','after_or_equal:start_date'],'rows'=>['nullable','array'],'rows.*.check_in'=>['nullable','date_format:H:i'],'rows.*.check_out'=>['nullable','date_format:H:i']]);
  $start=Carbon::parse($v['start_date'])->startOfDay(); $end=Carbon::parse($v['end_date'])->startOfDay();
  foreach($v['rows']??[] as $ds=>$row){ try{$date=Carbon::createFromFormat('Y-m-d',$ds)->startOfDay();}catch(\Throwable $e){continue;} if($date->lt($start)||$date->gt($end)||$date->isFriday()) continue; $in=$row['check_in']??null; $out=$row['check_out']??null; if(!$in&&!$out){ Attendance::where('employee_id',$v['employee_id'])->whereDate('work_date',$ds)->delete(); continue; } Attendance::updateOrCreate(['employee_id'=>$v['employee_id'],'work_date'=>$ds],['check_in'=>$in?:null,'check_out'=>$out?:null]); }
  return redirect()->route('attendance.sheet',['employee_id'=>$v['employee_id'],'start_date'=>$v['start_date'],'end_date'=>$v['end_date']])->with('success','تم حفظ الدوام وإعادة حساب النتائج.');
 }
 private function workedMinutes(string $date,string $checkIn,string $checkOut): int { $in=Carbon::parse("$date $checkIn"); $out=Carbon::parse("$date $checkOut"); if($out->lte($in)) $out->addDay(); return (int)$in->diffInMinutes($out); }
 private function summary(array $days): array { $total=0;$complete=0;$incomplete=0;$fridays=0;$workDays=0; foreach($days as $d){ if($d['is_friday']){$fridays++;continue;} $workDays++; $a=$d['attendance']; if($a?->check_in&&$a?->check_out){$total+=$d['minutes'];$complete++;} elseif($a?->check_in||$a?->check_out){$incomplete++;} } return ['total_minutes'=>$total,'hours_whole'=>intdiv($total,60),'minutes_remainder'=>$total%60,'decimal_hours'=>$total/60,'equivalent_days'=>$total/480,'complete_days'=>$complete,'incomplete_days'=>$incomplete,'fridays'=>$fridays,'calendar_work_days'=>$workDays]; }
}
