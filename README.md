# Kitchen Shelf

A mobile-first recipe organizer built with Expo for a shared household. The current app supports a local MVP workflow and can switch to Supabase-backed shared sync when project credentials are configured.

## Current App State

- Shared household sign-in gate with a device-local persisted session
- Settings surface with explicit sign-out
- Recipes, Groups, and Add tabs optimized for phone use
- Search, recipe detail, edit, delete, and open-source flows
- Custom groups with create, rename, delete, favorites, and many-to-many recipe membership
- Pull-to-refresh and visible cloud sync status when Supabase is configured
- Paste-a-link import flow with review-before-save
- Camera or photo-library cookbook import entry points
- Import job persistence for failed, in-review, and saved import lifecycle state
- Local AsyncStorage persistence when Supabase credentials are not configured
- Supabase repository and migrations for households, recipes, groups, memberships, group favorites, recipe timing fields, and import jobs

## Known Next Work

- Refresh the UI/UX foundation before adding larger feature surfaces
- Finish the Import History / Retry Center UI in the Add tab
- Complete share-into-app support beyond the current shared-import queue model
- Decide whether the MVP shared password remains enough or should move to Supabase Auth with household membership and RLS

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

Local mode means recipe data stays on the device through AsyncStorage. It still uses the seeded household credentials above.

## Supabase Setup

1. Copy `.env.example` to `.env`.
2. Add your Supabase project URL and anon key.
3. Run the SQL migrations in `supabase/migrations` in timestamp order.
4. Add an OpenAI secret for the edge function:
   `supabase secrets set OPENAI_API_KEY=your_key_here`
5. Optionally pin the model:
   `supabase secrets set OPENAI_MODEL=gpt-4.1-mini`
6. Deploy the edge function in `supabase/functions/import-recipe/index.ts`.
7. Point `EXPO_PUBLIC_SUPABASE_IMPORT_FUNCTION_URL` at the deployed function URL.
   For this project, the URL shape is:
   `https://mmgnnyllndteknxuglir.supabase.co/functions/v1/import-recipe`

The app uses local heuristic imports when the import function URL is not configured or when the backend is unavailable.

## Build Process

- Work on a `codex/...` branch for each coherent slice.
- Keep commits small and named around one outcome.
- Run `npm test -- --runInBand` and `npx tsc --noEmit` before claiming a slice is complete.
- Push branches to GitHub regularly and use draft pull requests for reviewable work.
- Do not mix unrelated changes into a commit.
