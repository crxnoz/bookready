{{--
  Phase 7 — appended rows for the details card.

  Renders:
    - one kv row per add-on (with +$price · +Nmin suffix)
    - one kv row for the assigned staff member, when present

  Both are no-ops when the source data is empty/missing, so this partial
  can be safely included in every booking-related blade.

  Required context:
    - $appt  (the plain-array appointment snapshot from the controllers)
--}}
@if (! empty($appt['addons']))
  @foreach ($appt['addons'] as $addon)
    @include('mail.partials.kv', [
      'label' => '+ ' . $addon['name'],
      'value' => '+$' . number_format((float) $addon['extra_price'], 2)
                . (! empty($addon['extra_duration_minutes'])
                    ? ' · +' . $addon['extra_duration_minutes'] . ' min'
                    : ''),
    ])
  @endforeach
@endif

@if (! empty($appt['staff_name']))
  @include('mail.partials.kv', [
    'label' => 'With',
    'value' => $appt['staff_name'],
  ])
@endif
