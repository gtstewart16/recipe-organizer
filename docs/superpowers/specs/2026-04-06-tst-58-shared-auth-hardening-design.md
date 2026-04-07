# TST-58 Shared Auth Hardening

## Summary

Harden the current shared-household access flow so the app behaves like a real household tool instead of a demo gate. For MVP, the product should keep a single shared household login, persist the authenticated session on-device, and only show the sign-in form again after an explicit sign-out.

This feature is about reducing friction for live household testing, not building a full account system.

## Problem

The app currently uses a hard-coded household email and password gate that works for development, but still feels temporary:

- the top-right `MVP` chip does not represent a real product action
- the sign-in flow feels like a demo instead of a durable app entry point
- if the app reverts to the sign-in gate too often, it adds friction for routine use
- there is no clear settings surface where a user can intentionally sign out

For live testing with your wife, access should feel calm and invisible after initial setup.

## Product Goal

Make the app feel like a shared household app that:

- is signed into once per device
- stays signed in until someone explicitly signs out
- hides auth complexity from everyday recipe browsing and importing

## Primary User

You and your wife using the same shared household library on your own devices.

## Chosen Product Direction

This feature follows these confirmed decisions:

- shared access will remain one household email/password for MVP
- you will manually share the credentials outside the app
- the app should stay signed in until explicit sign-out
- the top-right `MVP` chip should be replaced by a settings entry point
- the settings surface should only contain `Sign out` for now
- once a device is signed in, the sign-in form should not be shown again unless the user signs out

## In Scope

- persist signed-in session state locally on device
- restore signed-in session state during app startup
- replace the top-right `MVP` entry point with a settings action
- add a simple settings screen
- include a `Sign out` action in settings
- clear the persisted session on sign-out
- return to the sign-in screen after sign-out
- preserve the existing shared household data flow and Supabase-backed library behavior

## Out of Scope

- personal user accounts
- individual profiles
- invitation flows
- magic links
- password reset
- multiple household switching
- in-app credential sharing
- settings beyond `Sign out`

## UX Requirements

### Signed-out experience

When the user is signed out:

- the sign-in screen appears
- the user can enter the shared household email and password
- the sign-in screen should feel calm and intentional, not like a debug gate

### Signed-in experience

After a successful sign-in:

- the authenticated session is stored locally on that device
- future app launches should skip the sign-in screen
- the user should land directly in the library experience

### Settings entry point

The top-right chip currently labeled `MVP` should become a settings entry point.

Requirements:

- it should feel small and unobtrusive
- it should not compete with the main tab navigation
- it should clearly open settings rather than read as product status

### Settings screen

The first version should be intentionally minimal.

Requirements:

- open from the top-right settings entry point
- show a simple page or sheet with one primary action: `Sign out`
- support easy dismissal back into the app
- feel consistent with the app’s warm, premium mobile style

### Sign out behavior

When the user signs out:

- the persisted session is cleared immediately
- the app returns to the sign-in screen
- the current in-memory signed-in state is reset
- the device should require the shared credentials again on the next sign-in

## Data and State Design

The app should continue using the current shared household credential model for MVP, but add a lightweight device-local session layer.

The locally persisted session state only needs to answer:

- is this device currently signed into the shared household app?

This can remain intentionally simple. It does not need token management or multi-user session objects for this phase.

## Technical Design Intent

### Session persistence

- store signed-in state in local device storage
- restore it during app hydration before rendering the auth gate decision
- avoid brief flashes of the sign-in screen when a valid local session exists

### Navigation/state integration

- the app should gate the main UI based on restored session state
- sign-out should reset navigation back to the signed-out entry point cleanly
- settings should not interfere with recipe detail, group detail, or import review flows

### Reliability expectations

- local session restoration should work across app relaunches
- existing cloud-backed recipe/group state should continue to hydrate as it does today
- the device-local sign-in state should be independent of whether a sync refresh is currently happening

## Edge Cases

- if local session restoration fails, default safely to signed out
- if local storage is unavailable, keep the app usable and fall back to current in-memory behavior
- if a user opens settings while mid-flow in the app, sign-out should still work predictably
- sign-out should not leave stale signed-in UI visible behind the auth screen

## Acceptance Criteria

- after first successful sign-in, closing and reopening the app does not show the sign-in form again
- the top-right `MVP` chip is replaced with a settings entry point
- tapping settings opens a simple settings surface
- settings contains a `Sign out` action
- tapping `Sign out` returns the app to the sign-in screen
- after sign-out, reopening the app shows the sign-in screen again
- existing shared library data still loads correctly after sign-in

## Implementation Slices

This feature should likely be built in these slices:

1. Persist and restore signed-in session state
2. Replace the `MVP` chip with a settings entry point
3. Add the minimal settings screen with `Sign out`
4. Verify relaunch and sign-out behavior on simulator and phone

## Risks

- auth-state restoration could cause brief UI flicker if hydration order is wrong
- sign-out could leave stale navigation state if it does not reset app-level selection state cleanly
- adding too much settings UI now would create unnecessary product surface before it is needed

## Success Metric

This feature is successful if your wife can install/open the app, sign in once, and then use it like a normal shared household app without repeatedly seeing the login form.
