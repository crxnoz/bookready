<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * M3 — Template marketplace standardization: end-to-end field rename.
 *
 * Aligns internal names with their user-facing labels:
 *   - before_after_*  → results_*           (tables)
 *   - settings.steps  → settings.advice     (JSON key in template_settings)
 *   - settings.before_appointment → settings.timeline
 *   - settings.tabs.steps_label  → settings.tabs.advice_label
 *   - settings.tabs.before_appointment_label → settings.tabs.timeline_label
 *   - website_sections.section_key: 'before_after' → 'results',
 *                                   'steps' → 'advice',
 *                                   'before_appointment' → 'timeline'
 *
 * Single migration so a tenant is never in a half-renamed state. The
 * down() reverses everything for a clean rollback.
 *
 * Guard with Schema::hasTable / hasColumn so this migration is safe to
 * run on a tenant that was provisioned before the original
 * before_after migrations landed.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Rename tables. Index/FK metadata follows the rename automatically.
        if (Schema::hasTable('before_after_items') && ! Schema::hasTable('results_items')) {
            Schema::rename('before_after_items', 'results_items');
        }
        if (Schema::hasTable('before_after_groups') && ! Schema::hasTable('results_groups')) {
            Schema::rename('before_after_groups', 'results_groups');
        }

        // 2. Update website_sections.section_key — three renames.
        if (Schema::hasTable('website_sections')) {
            DB::table('website_sections')
                ->where('section_key', 'before_after')
                ->update(['section_key' => 'results']);
            DB::table('website_sections')
                ->where('section_key', 'steps')
                ->update(['section_key' => 'advice']);
            DB::table('website_sections')
                ->where('section_key', 'before_appointment')
                ->update(['section_key' => 'timeline']);
        }

        // 3. Rewrite template_settings.settings_json — move legacy keys
        // to their canonical names. We round-trip through PHP rather than
        // SQL's JSON_SET so the nested 'tabs' rename stays readable.
        if (Schema::hasTable('template_settings')) {
            $rows = DB::table('template_settings')->get(['id', 'settings_json']);
            foreach ($rows as $row) {
                $raw = is_string($row->settings_json) ? $row->settings_json : null;
                if (! $raw) continue;
                $decoded = json_decode($raw, true);
                if (! is_array($decoded)) continue;

                $changed = false;

                // Top-level: steps → advice, before_appointment → timeline.
                if (array_key_exists('steps', $decoded)) {
                    if (! array_key_exists('advice', $decoded)) {
                        $decoded['advice'] = $decoded['steps'];
                    }
                    unset($decoded['steps']);
                    $changed = true;
                }
                if (array_key_exists('before_appointment', $decoded)) {
                    if (! array_key_exists('timeline', $decoded)) {
                        $decoded['timeline'] = $decoded['before_appointment'];
                    }
                    unset($decoded['before_appointment']);
                    $changed = true;
                }

                // Nested tabs.*_label renames.
                if (isset($decoded['tabs']) && is_array($decoded['tabs'])) {
                    if (array_key_exists('steps_label', $decoded['tabs'])) {
                        if (! array_key_exists('advice_label', $decoded['tabs'])) {
                            $decoded['tabs']['advice_label'] = $decoded['tabs']['steps_label'];
                        }
                        unset($decoded['tabs']['steps_label']);
                        $changed = true;
                    }
                    if (array_key_exists('before_appointment_label', $decoded['tabs'])) {
                        if (! array_key_exists('timeline_label', $decoded['tabs'])) {
                            $decoded['tabs']['timeline_label'] = $decoded['tabs']['before_appointment_label'];
                        }
                        unset($decoded['tabs']['before_appointment_label']);
                        $changed = true;
                    }
                }

                if ($changed) {
                    DB::table('template_settings')
                        ->where('id', $row->id)
                        ->update(['settings_json' => json_encode($decoded)]);
                }
            }
        }
    }

    public function down(): void
    {
        // Reverse the three steps in opposite order.

        // 3. Restore settings_json keys.
        if (Schema::hasTable('template_settings')) {
            $rows = DB::table('template_settings')->get(['id', 'settings_json']);
            foreach ($rows as $row) {
                $raw = is_string($row->settings_json) ? $row->settings_json : null;
                if (! $raw) continue;
                $decoded = json_decode($raw, true);
                if (! is_array($decoded)) continue;

                $changed = false;
                if (array_key_exists('advice', $decoded)) {
                    if (! array_key_exists('steps', $decoded)) {
                        $decoded['steps'] = $decoded['advice'];
                    }
                    unset($decoded['advice']);
                    $changed = true;
                }
                if (array_key_exists('timeline', $decoded)) {
                    if (! array_key_exists('before_appointment', $decoded)) {
                        $decoded['before_appointment'] = $decoded['timeline'];
                    }
                    unset($decoded['timeline']);
                    $changed = true;
                }
                if (isset($decoded['tabs']) && is_array($decoded['tabs'])) {
                    if (array_key_exists('advice_label', $decoded['tabs'])) {
                        if (! array_key_exists('steps_label', $decoded['tabs'])) {
                            $decoded['tabs']['steps_label'] = $decoded['tabs']['advice_label'];
                        }
                        unset($decoded['tabs']['advice_label']);
                        $changed = true;
                    }
                    if (array_key_exists('timeline_label', $decoded['tabs'])) {
                        if (! array_key_exists('before_appointment_label', $decoded['tabs'])) {
                            $decoded['tabs']['before_appointment_label'] = $decoded['tabs']['timeline_label'];
                        }
                        unset($decoded['tabs']['timeline_label']);
                        $changed = true;
                    }
                }

                if ($changed) {
                    DB::table('template_settings')
                        ->where('id', $row->id)
                        ->update(['settings_json' => json_encode($decoded)]);
                }
            }
        }

        // 2. Restore section_keys.
        if (Schema::hasTable('website_sections')) {
            DB::table('website_sections')
                ->where('section_key', 'results')
                ->update(['section_key' => 'before_after']);
            DB::table('website_sections')
                ->where('section_key', 'advice')
                ->update(['section_key' => 'steps']);
            DB::table('website_sections')
                ->where('section_key', 'timeline')
                ->update(['section_key' => 'before_appointment']);
        }

        // 1. Restore tables.
        if (Schema::hasTable('results_items') && ! Schema::hasTable('before_after_items')) {
            Schema::rename('results_items', 'before_after_items');
        }
        if (Schema::hasTable('results_groups') && ! Schema::hasTable('before_after_groups')) {
            Schema::rename('results_groups', 'before_after_groups');
        }
    }
};
