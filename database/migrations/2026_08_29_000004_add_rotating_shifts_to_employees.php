<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('shift_mode', 20)->default('single');
            $table->string('shift_one', 20)->default('morning');
            $table->string('shift_two', 20)->default('evening');
            $table->date('rotation_start')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['shift_mode','shift_one','shift_two','rotation_start']);
        });
    }
};
