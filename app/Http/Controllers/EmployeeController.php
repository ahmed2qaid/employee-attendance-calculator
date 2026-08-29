<?php
namespace App\Http\Controllers;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
class EmployeeController extends Controller {
 public function store(Request $request): RedirectResponse {
  $data=$request->validate(['name'=>['required','string','max:150']]); Employee::create($data); return back()->with('success','تمت إضافة الموظف بنجاح.');
 }
 public function destroy(Employee $employee): RedirectResponse { $employee->delete(); return redirect()->route('attendance.index')->with('success','تم حذف الموظف.'); }
}
