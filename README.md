# Recipe Organizer MVP

A mobile-first recipe organizer built with Expo for a shared household. The current implementation ships a polished local MVP experience with reducer-driven recipe and group management, import review flows for pasted URLs and cookbook photos, and Supabase scaffolding for the shared backend.

## What Works Now

- Shared household sign-in gate for the app shell
- Recipes, Groups, and Add tabs optimized for phone use
- Paste-a-link import flow with review-before-save
- Camera or photo-library cookbook import entry points
- Editable recipes after save
- Custom groups with create, rename, delete, and many-to-many recipe membership
- Local persistence via AsyncStorage for MVP development

## Local Setup

1. Install dependencies:
   `npm install`
2. Start the Expo app:
   `npm run ios`
3. Run tests:
   `npm test`
4. Type-check:
   `npx tsc --noEmit`

The seeded local household credentials are:

- Email: `home@kitchen.test`
- Password: `password123`

Any non-empty values also enter the local MVP mode so you can move quickly while backend credentials are still unset.

## Supabase Setup

1. Copy `.env.example` to `.env`.
2. Add your Supabase project URL and anon key.
3. Run the SQL migration in `supabase/migrations/202603300001_init.sql`.
4. Add an OpenAI secret for the edge function:
   `supabase secrets set OPENAI_API_KEY=your_key_here`
5. Optionally pin the model:
   `supabase secrets set OPENAI_MODEL=gpt-4.1-mini`
6. Deploy the edge function in `supabase/functions/import-recipe/index.ts`.
7. Point `EXPO_PUBLIC_SUPABASE_IMPORT_FUNCTION_URL` at the deployed function URL.
   For this project, the URL shape is:
   `https://mmgnnyllndteknxuglir.supabase.co/functions/v1/import-recipe`

The app currently stays in heuristic local mode until the import function URL is added. Once the function is configured, URL imports automatically prefer the AI-normalized result and fall back to local heuristics only if the backend is unavailable.
