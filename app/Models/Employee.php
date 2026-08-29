<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
class Employee extends Model {
    protected $fillable=['name','shift_type','late_grace','early_grace'];
    protected $casts=['late_grace'=>'integer','early_grace'=>'integer'];
    public function attendances(): HasMany { return $this->hasMany(Attendance::class); }
}
