# Employee Attendance Calculator — Laravel + Supabase PostgreSQL

نسخة Laravel 13 تستخدم PostgreSQL في Supabase، مع سياسة دوام قابلة للتهيئة.

## التهيئة
1. انسخ `.env.example` إلى `.env`.
2. ضع بيانات اتصال PostgreSQL الخاصة بمشروع Supabase.
3. عدّل القيم الافتراضية إن رغبت:
   - `ATTENDANCE_DEFAULT_SHIFT=morning`
   - `ATTENDANCE_DEFAULT_LATE_GRACE=15`
   - `ATTENDANCE_DEFAULT_EARLY_GRACE=5`
4. نفّذ `composer install`, ثم `php artisan key:generate`, ثم `php artisan migrate`.
5. شغّل `php artisan serve`.

## سياسة الدوام
- الموظف الجديد يرث سياسة المشروع الافتراضية من `.env`.
- يمكن تعديل الوردية وسماح التأخير وسماح الانصراف المبكر لكل موظف من شاشة كشف الدوام.
- إذا كان التأخير داخل السماح لا يُحتسب؛ وإذا تجاوزه تُحتسب المدة كاملة من بداية الوردية.
- إذا كان الانصراف المبكر داخل السماح لا يُحتسب؛ وإذا تجاوزه تُحتسب المدة كاملة حتى نهاية الوردية.
- الجمعة مستثناة تلقائيًا.
- لا دخول ولا خروج = غياب.
- بصمة واحدة = يوم معلق.
- بصمتان = حضور.
- 8 ساعات = 480 دقيقة = يوم عمل واحد.

## Supabase
Supabase هنا هو PostgreSQL. Laravel يبقى الـ Backend ويحتاج استضافة PHP تدعم Laravel.
