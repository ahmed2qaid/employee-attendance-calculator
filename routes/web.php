<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\EmployeeController;
use Illuminate\Support\Facades\Route;

Route::get('/', [AttendanceController::class, 'index'])->name('attendance.index');
Route::post('/employees', [EmployeeController::class, 'store'])->name('employees.store');
Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->name('employees.destroy');
Route::get('/attendance', [AttendanceController::class, 'sheet'])->name('attendance.sheet');
Route::post('/attendance/save', [AttendanceController::class, 'save'])->name('attendance.save');
