<?php

return [
    'default_late_grace' => (int) env('ATTENDANCE_DEFAULT_LATE_GRACE', 15),
    'default_early_grace' => (int) env('ATTENDANCE_DEFAULT_EARLY_GRACE', 5),
    'default_shift' => env('ATTENDANCE_DEFAULT_SHIFT', 'morning'),
];
