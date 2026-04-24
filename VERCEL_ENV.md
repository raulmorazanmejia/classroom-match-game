# Vercel environment variables for secure delete

Set these **server-side** environment variables in Vercel for the `/api/delete-activity` route:

- `SUPABASE_URL` (server-side Supabase project URL)
- `SUPABASE_SERVICE_ROLE_KEY` (server-side service role key; never expose to frontend)

The frontend still uses:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not replace frontend anon keys with the service role key. The service role key must only be used in server API routes.
