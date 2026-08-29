# تهيئة Next.js + Supabase

هذه النسخة لا ترتبط بأي مشروع Supabase ثابت. كل مستخدم جديد يستطيع Clone/Fork ثم ربطها بمشروع Supabase الخاص به.

## 1) إنشاء قاعدة البيانات
1. أنشئ مشروعًا جديدًا في Supabase.
2. افتح SQL Editor.
3. شغّل الملف `supabase/schema.sql` الموجود في هذا الفرع.

## 2) إعداد الاتصال
انسخ ملف البيئة:

```bash
cp .env.example .env.local
```

ثم ضع بيانات مشروعك:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

لا تضع مفاتيح حقيقية داخل GitHub.

## 3) التشغيل المحلي
```bash
npm install
npm run dev
```

## 4) النشر
- Vercel: اختر branch `nextjs-supabase` وأضف متغيرات البيئة السابقة.
- Netlify: اختر branch `nextjs-supabase`، شغّل `npm run build`، وأضف متغيرات البيئة نفسها.

## المرونة
- كل مستخدم يملك Supabase منفصلًا.
- إنشاء الجداول يتم من ملف SQL داخل المشروع.
- تغيير Supabase لا يحتاج تعديل الكود؛ فقط متغيرات البيئة.
- الحساب يعتمد الدقائق ويستثني الجمعة تلقائيًا.

> قبل الاستخدام الإنتاجي فعّل Supabase Auth وسياسات RLS مقيدة بالمستخدم/المؤسسة.
