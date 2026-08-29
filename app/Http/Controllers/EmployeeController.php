<?php
namespace App\Http\Controllers;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
class EmployeeController extends Controller {
 public function store(Request $request): RedirectResponse {
  $data=$request->validate(['name'=>['required','string','max:150']]);
  $data += [
   'shift_type'=>config('attendance.default_shift','morning'),
   'late_grace'=>config('attendance.default_late_grace',15),
   'early_grace'=>config('attendance.default_early_grace',5),
  ];
  Employee::create($data); return back()->with('success','تمت إضافة الموظف باستخدام سياسة الدوام الافتراضية.');
 }
 public function destroy(Employee $employee): RedirectResponse { $employee->delete(); return redirect()->route('attendance.index')->with('success','تم حذف الموظف.'); }
}
