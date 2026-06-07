<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Standard Laravel failed_jobs table. Our queue is redis but
 * config/queue.php's failed driver is `database-uuids`, which writes
 * here whenever a job exhausts retries. Without this table any failure
 * would crash the queue worker instead of being captured.
 *
 * Read by /admin/dashboard/queue (drill-down view) so the operator
 * can see why a job died without grepping logs.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('failed_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->text('connection');
            $table->text('queue');
            $table->longText('payload');
            $table->longText('exception');
            $table->timestamp('failed_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('failed_jobs');
    }
};
