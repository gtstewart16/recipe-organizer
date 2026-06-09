# TST-59 Import History and Retry Center Design

## Summary

Turn the `Add` tab into a reliable import hub by keeping the primary import actions at the top and surfacing a persisted import history directly below them. The goal is to make recipe capture feel safe, recoverable, and trustworthy during real household usage.

This feature should reduce the chance that failed imports, partial drafts, or recently saved recipes disappear into the current `Add` flow. It should help the app feel dependable enough for live day-to-day testing between two people.

## Problem

The app’s core value depends on importing recipes from messy real-world sources like Instagram links, recipe websites, and cookbook photos. Today, import behavior is visible in the moment, but it does not yet feel durable:

- failed imports feel temporary
- review drafts are easy to lose track of
- recently successful imports are not visible from the import surface
- there is no clear “did the app catch what I sent?” inbox for the user

That creates unnecessary uncertainty in the most important workflow in the app.

## Product Goal

Make recipe import feel like a workflow instead of a one-shot action.

The user should feel confident that:

- the app remembers import attempts
- failed imports can be retried later
- drafts can be resumed without starting over
- recent successful imports are visible and reassuring

## User Value

For a shared household use case, this feature should answer a simple question clearly:

“Did my recipe make it into the app, and if not, what should I do next?”

That makes the app safer to use in real life and improves trust during live testing.

## Chosen UX Direction

The `Add` tab becomes `Import + History`.

The top of the screen remains focused on import actions:

1. `From link`
2. `From photo`

Below that, the screen shows `Import history`.

This keeps importing and recovery in the same mental space without introducing another tab or extra navigation.

## History Sections

Import history is split into three sections in this order:

1. `Needs attention`
2. `In review`
3. `Recently saved`

### Needs Attention

Contains failed imports.

Each item should show:

- source type (`Link` or `Photo`)
- a short source hint or title
- concise error state
- retry action

This section is the most important because it gives the user an obvious recovery path.

### In Review

Contains imports that were parsed into a draft but not yet confirmed into the library.

Each item should show:

- source type
- draft title if available
- a short “ready to review” style state
- action to resume the draft

Tapping the item should reopen the review flow.

### Recently Saved

Contains a short, capped list of recent successful imports.

Purpose:

- reassure the user that imports are being completed
- provide quick access back into recently added recipes

This should be capped to avoid clutter. Initial cap: `5` items.

## Why This Structure

This keeps the screen focused and useful:

- failed items stay visible and actionable
- unfinished work stays resumable
- successful imports are visible but do not overwhelm the page

It also avoids the noise of showing every historical import forever.

## In Scope

- Add-tab layout update to include import history below import actions
- persisted import jobs
- visible statuses for failed, in-review, and recently saved imports
- retry action for failed imports
- resume action for drafts
- open action for recent saved recipes
- cross-device persistence through Supabase

## Out of Scope

- full audit log of every historical import
- filters, sorting controls, or bulk actions
- notifications
- advanced analytics
- new import source types

## UX Requirements

### Add Tab Layout

The `Add` tab should preserve its current top-of-screen import actions and review flow. The new history area should sit below these entry points and feel like part of the same surface, not like a separate product area.

When the user is actively editing a review draft, the draft experience should remain primary. Import history should not interrupt or compete with draft editing.

### History Item Presentation

History rows should be compact, readable, and clearly state:

- what was imported
- what state it is in
- what action is available next

The visual treatment should align with the warm, premium direction already established in the library polish work.

### Retry Behavior

Failed link/photo imports should support retry using their original source information where possible.

If retry is not possible because required source data is missing, the UI should say so clearly rather than offering a broken retry action.

### Resume Behavior

Draft imports should restore the same review state the user left, including parsed fields and any editable values already present in the draft.

### Recently Saved Behavior

Saved items should open the associated recipe detail when tapped.

## Data Model

This feature requires a persisted import job model rather than only transient import UI state.

Each import job should include:

- `id`
- `sourceType` as `url` or `photo`
- original source reference
  - URL for link imports
  - photo URIs or stored source references for photo imports
- `status`
  - `failed`
  - `in_review`
  - `saved`
- `title` or best available source label
- `errorMessage` when failed
- serialized draft payload when resumable
- linked `recipeId` when saved
- timestamps for created and updated time

## Persistence Expectations

Import jobs should persist in Supabase so they:

- survive app restarts
- appear across devices
- support real-world shared usage

This is important because the value of the feature drops sharply if history only exists locally on one device.

## Interaction Model

### When a link or photo import fails

- create or update an import job in `failed`
- show the immediate inline error as today
- also make the failed item visible in `Needs attention`

### When parsing succeeds and review begins

- create or update an import job in `in_review`
- store enough draft data to resume editing

### When review is confirmed and recipe is saved

- move the import job to `saved`
- link it to the saved recipe
- make it eligible for the `Recently saved` section

## Empty States

If no history exists yet, the history area should feel intentional rather than blank.

Suggested tone:

- warm and encouraging
- simple reminder that new imports will show up here

Section-level empty states should be lightweight. A single overall empty state is preferable to multiple empty boxes.

## Error Handling

- Failed imports should preserve a readable short message.
- Retry failures should update the same job rather than duplicating many broken rows.
- If a saved recipe linked from a history item no longer exists, the row should degrade gracefully and not crash the screen.

## Technical Design Notes

- The current transient import flow should become backed by an import-jobs layer.
- The Add tab should read both live draft state and persisted history state without confusing the two.
- Saved jobs should likely be capped at the query/UI layer so the surface remains light.

## Acceptance Criteria

- The `Add` tab shows import actions first and history below
- Failed imports appear in `Needs attention`
- Review drafts appear in `In review`
- Recently saved imports appear in `Recently saved`
- Failed imports can be retried from history
- Draft imports can be resumed from history
- Saved imports can reopen their recipe detail
- History survives restart and syncs across devices
- The UI remains warm, compact, and easy to understand

## Risks

- If history is too dense, the `Add` tab may feel heavy instead of helpful
- If retry creates duplicate jobs, trust will drop
- If draft persistence is incomplete, resuming work may feel unreliable

## Recommendation

Build the smallest version that makes importing feel dependable:

- three clear sections
- persisted jobs
- retry / resume / open actions
- no extra filtering or secondary navigation yet

That will be enough to support real live usage and gather the next round of product feedback.
