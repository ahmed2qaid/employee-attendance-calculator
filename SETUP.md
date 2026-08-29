# تهيئة Laravel + Supabase PostgreSQL

هذه النسخة تستخدم Laravel كـ backend وSupabase كقاعدة PostgreSQL فقط. لا توجد بيانات اتصال حقيقية داخل GitHub.

## 1) إنشاء Supabase
أنشئ مشروعًا جديدًا ثم افتح Database > Connection settings وانسخ بيانات الاتصال أو Session/Transaction pooler.

## 2) إعداد Laravel
```bash
composer install
cp .env.example .env
php artisan key:generate
```

عدّل `.env`:

```env
DB_CONNECTION=pgsql
DB_HOST=YOUR_SUPABASE_POOLER_HOST
DB_PORT=6543
DB_DATABASE=postgres
DB_USERNAME=postgres.YOUR_PROJECT_REF
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_SSLMODE=require
```

## 3) إنشاء الجداول
```bash
php artisan migrate
```

## 4) التشغيل المحلي
```bash
php artisan serve
```

## 5) النشر
Laravel يحتاج بيئة تشغّل PHP مثل Laravel Cloud أو Railway أو Render أو استضافة PHP/VPS. Supabase هنا يستبدل قاعدة البيانات المحلية، لكنه لا يشغّل Laravel نفسه.

## المرونة
- `.env.example` يحتوي placeholders فقط.
- أي مستخدم يستطيع ربط المشروع بـ Supabase مختلف دون تعديل الكود.
- migrations تنشئ بنية الجداول داخل PostgreSQL الخاص به.
- الأسرار تبقى في متغيرات البيئة على جهازه أو منصة الاستضافة.
