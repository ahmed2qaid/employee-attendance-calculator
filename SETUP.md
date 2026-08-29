# Next.js + Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill the project URL and anon key.
4. Run `npm install` then `npm run dev`.
5. Deploy to Vercel or Netlify and add the same environment variables.

The branch calculates attendance in minutes, excludes Fridays automatically, and stores attendance rows in Supabase.

> Security note: the included RLS policies are intentionally open for a quick prototype. Add Supabase Auth and user-scoped policies before production use.
