# Kitchen Shelf

Kitchen Shelf is a mobile-first, recipe-only organizer for a shared household. The MVP centers on a shared recipe library, groups and favorites, recipe import/review/history, iOS share-into-app, and recipe sync/auth. Meal planning and grocery lists are intentionally outside the MVP release path.

## MVP Scope

- Shared household sign-in gate with a device-local persisted session.
- Recipes, Groups, and Add tabs optimized for phone use.
- Shared recipe library with search, detail, edit, delete, and source-opening flows.
- Custom groups with create, rename, delete, favorites, and many-to-many recipe membership.
- Paste-a-link, shared-text, camera, and photo-library import entry points.
- Review-before-save import flow plus retryable import history for failed, in-review, and saved jobs.
- iOS share extension that can send recipe URLs or text into the app for review.
- Local AsyncStorage persistence when Supabase credentials are not configured.
- Supabase-backed sync for households, recipes, groups, memberships, group favorites, timing fields, source type, and import jobs when credentials are configured.

## Local Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy environment defaults:

   ```sh
   cp .env.example .env
   ```

3. For local-only mode, leave the Supabase URL and anon key blank. Recipe data stays on the device through AsyncStorage.

4. Use the seeded local household credentials:

   ```text
   Email: home@kitchen.test
   Password: password123
   ```

## Running The App

### Expo Go

Expo Go is enough for the JavaScript recipe flows that do not require native share-extension behavior:

```sh
npm start
```

Then scan the QR code from Expo Go, or run a platform shortcut:

```sh
npm run ios
npm run android
```

### Development Build

Use a development build for native iOS share-into-app testing because Expo Go does not include this repo's custom share extension:

```sh
npx expo run:ios
npx expo start --dev-client
```

For a physical iOS device, install/run the dev build from Xcode or use Expo CLI's device flow:

```sh
npx expo run:ios --device
```

## Share Extension Rebuild

The iOS share extension is wired through `app.json` and `plugins/with-ios-share-into-app.js`, which generate the `KitchenShelfShare` target and app-group plumbing under `ios/`.

Rebuild native iOS files after changing the Expo config, the share-extension plugin, bundle identifiers, entitlements, or native share-extension code:

```sh
npx expo prebuild --platform ios
npx expo run:ios
```

After installing the rebuilt app, verify share-into-app by sharing a recipe URL or recipe-like text from another iOS app into Kitchen Shelf, then opening the Add tab and reviewing the queued recipe draft before saving.

## Supabase And Import Function

The app can run locally without Supabase credentials. To enable shared sync and backend recipe normalization:

1. Set the public client values in `.env`:

   ```sh
   EXPO_PUBLIC_SUPABASE_URL=your_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   EXPO_PUBLIC_SUPABASE_IMPORT_FUNCTION_URL=https://your-project-ref.supabase.co/functions/v1/import-recipe
   ```

2. Apply the SQL migrations in `supabase/migrations` in timestamp order.

3. Configure edge-function secrets:

   ```sh
   npx supabase secrets set OPENAI_API_KEY=your_key_here
   npx supabase secrets set OPENAI_MODEL=gpt-4.1-mini
   ```

4. Deploy the import function:

   ```sh
   npx supabase functions deploy import-recipe
   ```

5. Restart Expo after changing `.env` so the public values are reloaded.

When `EXPO_PUBLIC_SUPABASE_IMPORT_FUNCTION_URL` is blank or unavailable, imports fall back to local heuristic parsing. When Supabase URL/key are blank, the app stays in local AsyncStorage mode.

## Repeatable Checks

The release-readiness scripts are:

```sh
npm run typecheck
npm run test:ci
npm run check
```

`npm run check` runs the CI test command and then TypeScript.

## Release Verification

Before parent review or release handoff, run:

```sh
npm run typecheck
npm run test:ci
npm run check
npx expo config --type public
```

Also do a manual MVP pass on the target build:

- Sign in with the household credentials.
- Create, edit, delete, search, and favorite recipes.
- Create/rename/delete groups and save recipes into groups.
- Import a recipe from URL, shared text, camera, and photo library, then review before saving.
- Retry or dismiss failed import-history entries.
- Share a recipe URL/text into the iOS app from another app and confirm it appears in the Add tab for review.
- With Supabase configured, confirm pull-to-refresh and visible sync status against the shared recipe library.

Keep release scope recipe-only: shared recipe library, groups/favorites, import/review/history, share-into-app, and sync/auth.
