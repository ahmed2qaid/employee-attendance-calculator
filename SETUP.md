# Flutter Web + Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. From this branch run `flutter create .` once to regenerate any missing platform scaffold files.
4. Run `flutter pub get`.
5. Start locally with:

`flutter run -d chrome --dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co --dart-define=SUPABASE_ANON_KEY=YOUR_ANON_KEY`

6. Production build:

`flutter build web --release --dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co --dart-define=SUPABASE_ANON_KEY=YOUR_ANON_KEY`

Deploy the generated `build/web` folder to Netlify.

> Security note: the included RLS policies are open for prototype testing. Add authentication and restricted policies before production use.
