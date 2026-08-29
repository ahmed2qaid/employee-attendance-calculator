# إعداد Next.js + Supabase

1. أنشئ مشروع Supabase جديدًا.
2. افتح SQL Editor وشغّل كامل الملف `supabase/schema.sql`.
3. انسخ `.env.example` إلى `.env.local`.
4. ضع `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY` الخاصين بمشروعك.
5. نفّذ `npm install` ثم `npm run dev`.
6. عند النشر على Vercel أو Netlify أضف نفس متغيرات البيئة.

## إعدادات الدوام
- `app_settings` يحفظ القيم الافتراضية العامة لسماح التأخير والانصراف المبكر.
- `employee_policies` يحفظ الوردية والسماحات الخاصة بكل موظف.
- `attendances` يحفظ أوقات الدخول والخروج.
- يمكن تغيير القيم من الواجهة دون تعديل الكود.

> سياسات RLS الحالية مخصصة للتجربة السريعة. قبل الاستخدام الإنتاجي أضف Supabase Auth وسياسات مقيدة بالمستخدم أو المؤسسة.
