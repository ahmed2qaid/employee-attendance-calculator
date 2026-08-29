<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('shift_type', 20)->default('morning');
            $table->unsignedInteger('late_grace')->default(15);
            $table->unsignedInteger('early_grace')->default(5);
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['shift_type', 'late_grace', 'early_grace']);
        });
    }
};
