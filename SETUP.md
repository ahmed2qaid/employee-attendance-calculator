# تهيئة Flutter Web + Supabase

هذه النسخة قابلة للنقل لأي مستخدم أو مشروع Supabase جديد بدون تغيير منطق التطبيق.

## 1) Supabase
1. أنشئ مشروع Supabase جديدًا.
2. افتح SQL Editor.
3. شغّل `supabase/schema.sql`.

## 2) تجهيز Flutter
```bash
flutter create .
flutter pub get
```

## 3) التشغيل المحلي
مرر بيانات Supabase كإعدادات بناء بدل كتابتها داخل الكود:

```bash
flutter run -d chrome \
  --dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## 4) بناء نسخة Web
```bash
flutter build web --release \
  --dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

ارفع مجلد `build/web` إلى Netlify أو أي استضافة static.

## المرونة
- لا توجد بيانات Supabase خاصة بالمطور داخل المستودع.
- كل مستخدم ينشئ قاعدة بياناته عبر `supabase/schema.sql`.
- تغيير Supabase يتم فقط عبر `--dart-define`.
- يمكن لاحقًا استخدام نفس الكود لـ Android وiOS مع نفس Supabase.

> قبل الإنتاج: أضف Supabase Auth وRLS مقيدًا بالمستخدم/المؤسسة.
