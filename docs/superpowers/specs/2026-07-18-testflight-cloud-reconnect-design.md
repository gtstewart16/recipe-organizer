# TestFlight Cloud Reconnect Design

## Goal

Reconnect the TestFlight app to the existing Supabase project and load the 18 recipes already stored in the shared cloud household. Existing local-only data on either phone is disposable and must not be merged.

## Source Of Truth

Supabase is the sole source of truth whenever a production cloud configuration is present. The existing `The Kitchen` household remains the shared library; no new database, household, or account model is introduced in this release.

## Configuration

The `testflight` EAS profile uses the EAS `production` environment. That environment must contain:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_IMPORT_FUNCTION_URL`

These are public client values, never a Supabase service-role or secret key.

## Startup Behavior

When the Supabase configuration is available, the app creates the cloud repository and loads the existing household state. The cloud response replaces the in-memory recipe state, so stale AsyncStorage recipes are ignored. No local recipes, groups, memberships, or import jobs are uploaded.

For a store/TestFlight build, missing cloud configuration must be surfaced as a configuration error rather than silently enabling local-only persistence. Local mode remains available for development and tests.

## Verification

- A configuration test proves production mode rejects missing Supabase values.
- Existing repository tests continue to prove cloud hydration replaces local state.
- The release build's embedded Expo config contains the Supabase URL and a non-empty publishable/anon key.
- A production database query still reports one household and 18 recipes before release.
- On both TestFlight phones, the group counts match the cloud state after build 5 is installed.

## Data Safety

No cloud rows are deleted or rewritten as part of reconnection. Phone-local AsyncStorage can remain on disk but is ignored while cloud mode is active. Uninstalling the old build is optional after build 5 successfully shows the cloud library.
