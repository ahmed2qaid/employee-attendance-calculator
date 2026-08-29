<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
class Employee extends Model {
    protected $fillable=['name','shift_type','shift_mode','shift_one','shift_two','rotation_start'];
    protected $casts=['rotation_start'=>'date'];
    public function attendances(): HasMany { return $this->hasMany(Attendance::class); }
}
