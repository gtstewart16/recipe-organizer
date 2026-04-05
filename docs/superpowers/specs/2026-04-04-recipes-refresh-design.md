# Recipes Refresh Design

## Goal
Add a lightweight shared-sync refresh experience across the top-level app tabs so users can manually refresh cross-device changes without fully restarting the app.

## Scope
This slice affects the `Recipes`, `Groups`, and `Add` tabs.

It will add:
- pull-to-refresh on `Recipes`
- pull-to-refresh on `Groups`
- pull-to-refresh on `Add` when the user is on the import landing view
- a visible sync status surface near the top of the `Recipes` screen
- `Refreshing...` feedback while a cloud reload is in progress
- `Last synced ...` messaging after successful cloud loads
- short inline refresh error feedback if a refresh fails
- mobile-friendly button press feedback so tappable controls visibly react when pressed

It will not add:
- realtime subscriptions
- background polling
- pull-to-refresh while the user is actively editing a review draft on the `Add` tab
- complex sync conflict handling

## Product Behavior
When the app is using Supabase-backed sync:
- the `Recipes` and `Groups` lists support native pull-to-refresh
- the `Add` tab supports pull-to-refresh only when the user is on the initial import screen
- pulling refreshes the shared library via the existing cloud repository
- the `Recipes` screen shows a compact sync status card
- the `Groups` and `Add` tabs can use lighter refresh feedback, such as the native spinner plus error copy when needed
- after a successful load or refresh, the UI stores and displays the latest successful sync time
- if refresh fails, the UI keeps the last successful sync time when available and shows a short error state

When the app is running without cloud config:
- pull-to-refresh does not need to appear
- existing local-only behavior remains unchanged

## UI
The `Recipes` screen will reuse the existing warm sync-status treatment.

States:
- `Refreshing your shared library...`
- `Last synced just now` or a simple local timestamp
- `Refresh paused` with a short retry-oriented message on failure

The status element should stay visually secondary to the recipe content but obvious enough to reassure users that shared sync is working.

Refresh behavior by tab:
- `Recipes`: visible sync card plus pull-to-refresh
- `Groups`: pull-to-refresh and lightweight error handling
- `Add`: pull-to-refresh on the import landing screen only; no refresh gesture during review editing

Interactive controls in the affected area should also feel more native on mobile:
- buttons and chips should show immediate pressed-state feedback
- the pressed treatment should be subtle and fast, such as opacity, scale, or color shift
- the feedback should improve tap confidence without making the interface feel noisy

## Architecture
Keep the current `App.tsx` structure for this slice.

Add minimal state for:
- `isRefreshing`
- `lastSyncedAt`
- `refreshError`

Use the existing cloud repository `loadState()` method as the refresh source of truth.

Update `lastSyncedAt` whenever a cloud load succeeds, including the initial post-sign-in load and later manual refreshes.

## Error Handling
If refresh fails:
- preserve the current visible recipe list
- show an inline error state in the sync-status UI on `Recipes`
- show short non-disruptive error feedback on `Groups` and `Add`
- do not clear the last known successful sync timestamp

## Testing
Add or update tests to cover:
- sync status visible on the `Recipes` screen when cloud sync is enabled
- refresh loading state copy
- successful refresh updates the visible sync state
- failed refresh shows refresh error feedback without crashing
- pull-to-refresh wiring exists on `Recipes`, `Groups`, and `Add` landing state
- refresh is not active while editing a review draft on `Add`
- button press interactions still work after adding pressed-state styling

## Notes
This is still a focused quality-of-life slice after proving multi-device persistence. If it feels good in real use, the next step can be focus-based refresh or realtime updates rather than adding more manual sync complexity.
