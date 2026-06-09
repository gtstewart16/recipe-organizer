# TST-61 Share Into App Design

## Goal
Let iPhone users share recipe content from apps like Instagram, Safari, and Chrome into Recipe Organizer so a recipe draft is captured in the background and ready for review inside the app.

## Scope
This slice covers iOS share-sheet intake for recipe imports and a pending draft queue in the main app.

It will add:
- an iOS share target for Recipe Organizer
- support for shared recipe URLs
- support for shared text and caption payloads
- a pending shared-import queue on the `Add` tab
- best-effort background draft creation before the user returns to the app
- reuse of the existing review-before-save import flow
- source attribution when the source app or domain is available
- retryable error states for shared imports that fail normalization

It will not add:
- Android share intents
- a separate full-screen inbox or import history center
- binary media sharing from other apps as a primary v1 path
- aggressive duplicate detection across shared imports
- background orchestration beyond the initial share capture flow
- bypassing the current review-before-save requirement

## User Goal
The user can find a recipe in another iOS app, use the system share sheet, choose Recipe Organizer, and trust that the recipe draft will be waiting in the app without needing to paste content manually.

## Product Behavior
Recipe Organizer appears as an iOS share-sheet destination for supported share payloads.

V1 accepts:
- canonical URLs shared from browsers or apps
- plain text or caption-like content shared from apps such as Instagram

After the user chooses Recipe Organizer in the share sheet:
- the app captures the shared payload in the background
- the payload is stored as a pending shared import in app-accessible shared storage
- the user can return to the main app without filling out a form first

When the main app launches or resumes:
- the `Add` tab loads pending shared imports
- the top of the screen shows a `Shared imports ready` queue
- each queue item shows lightweight context such as source type, source app/domain when available, timestamp, and status
- tapping a ready item opens the existing `Review import` screen with the draft prefilled

The queue supports these user-visible states:
- `Processing`: the shared payload was captured and the app still needs to finish normalization
- `Ready to review`: the draft is available and can open directly into review
- `Needs attention`: the payload was captured, but recipe extraction failed or produced incomplete output; the user can retry or dismiss it
- `Unsupported`: the shared item does not appear to contain recipe content or lacks enough usable input to continue

Every successful share path still ends in the existing review flow before the recipe is saved into the library.

## Architecture
Add a small shared-import subsystem that is separate from the saved recipe library.

On iOS:
- the share extension captures incoming payloads from the system share sheet
- it writes pending shared-import records into shared app-group storage so the main app can read them
- each record includes fields such as `id`, `createdAt`, `sourceKind`, raw payload, source attribution metadata, current status, and an optional normalized draft snapshot

The share extension should stay lightweight:
- capture and persist the incoming URL or text payload reliably
- preserve source metadata when iOS provides it
- do only best-effort preprocessing that is fast and safe inside extension constraints
- avoid owning the full recipe-import UX

The main app owns the rest of the flow:
- load pending shared imports on launch, foreground, and relevant screen focus
- render the queue on the `Add` tab
- finish normalization when an item is still processing or pending
- map ready items into the existing `Review import` editor
- remove or resolve queue items after successful save or user dismissal

To stay aligned with the current codebase:
- shared URL imports should reuse the existing URL import pipeline
- shared text imports should use a new text-based normalization path that follows the same remote recipe-structuring pattern used for URL and photo imports today
- the review screen, save action, and source attribution behavior should remain part of the existing recipe draft workflow instead of introducing a second save model

## Data Model
Introduce a pending shared-import record for app-group storage. The exact implementation can vary, but the stored shape should support:
- stable item identity
- creation/update timestamps
- source kind such as `url` or `text`
- raw shared payload
- optional source app or domain metadata
- processing status
- optional normalized draft snapshot
- error message for retryable or unsupported states

This queue data should remain distinct from saved `RecipeRecord` entries so incomplete imports do not pollute the recipe library.

## Error Handling
Failures should be visible, recoverable, and non-destructive.

If share capture fails inside the extension:
- show a short failure message in the share flow when possible
- do not pretend the item was imported successfully

If capture succeeds but normalization later fails:
- preserve the pending queue item
- keep the raw payload so the app can retry later
- surface a short explanation in the queue
- allow retry or dismissal without affecting other pending imports

If a shared item is clearly not a recipe:
- keep it in an `Unsupported` state long enough for the user to understand what happened
- let the user dismiss it explicitly

If the user shares the same source multiple times:
- duplicates are acceptable in v1
- simple exact-match dedupe is optional only if it is cheap and reliable

## UX Notes
The queue should feel like a lightweight staging area, not a second recipe list.

The `Add` tab should:
- keep the current import entry points
- add a compact pending queue above or near the existing import actions
- make the newest shared draft easy to spot without forcing immediate navigation

The share extension itself should keep messaging brief, such as:
- `Sent to Recipe Organizer`

Detailed recovery, retries, and review actions belong in the main app.

## Testing
Add or update coverage for:
- share payload ingestion into shared storage on iOS-facing helpers
- queue loading and rendering on the `Add` tab
- opening a queued item into the existing `Review import` screen
- shared URL imports reusing the current URL normalization path
- shared text imports using the new text normalization path
- failure states that preserve retryable queue items
- dismissal or successful save resolving the pending queue item
- cold-start and warm-start behavior so recently shared items appear reliably

Because native share extensions have platform-specific behavior, this slice should also include manual iOS device validation for:
- sharing a recipe URL from Safari or Chrome
- sharing recipe text or caption content from Instagram or a similar app
- opening the app after sharing and seeing the pending queue update correctly
- retrying a failed queued import

## Success Criteria
- A user can share a recipe URL from an iPhone app into Recipe Organizer and see a pending draft in the app
- A user can share recipe-like text or caption content into Recipe Organizer and get a reviewable draft or a recoverable queue state
- The app preserves the current review-before-save workflow
- Failed shared imports are not silently dropped
- The queue can handle more than one pending shared import

## Backlog Follow-Up
Android share intents should be the next platform expansion after the iOS flow proves out. That follow-up should reuse the same product model where possible:
- capture shared payloads into a pending queue
- reuse shared normalization paths
- keep review-before-save intact

## Notes
This design intentionally introduces a queue instead of auto-opening the newest import. The queue is more resilient for repeated shares, interrupted app launches, and partial background processing, while still keeping the overall user experience lightweight.
