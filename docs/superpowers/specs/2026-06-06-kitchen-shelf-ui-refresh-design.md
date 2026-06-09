# Kitchen Shelf UI Refresh Design

## Goal

Refresh Kitchen Shelf into a cozy premium mobile recipe app while preserving full interactivity. The direction blends Airbnb's simple mobile shell, generous spacing, bold readable hierarchy, rounded cards, and calm navigation with ReciMe's recipe-specific readability, food imagery, cookbook organization, and ingredient/instruction clarity.

This is a real app refresh, not a static prototype. Every touched control must remain functional.

## Design Inputs

- User-selected style direction: cozy premium cooking app.
- User-selected execution depth: visual refresh plus light component cleanup.
- User-selected visual source: Premium Hybrid, using Airbnb simplicity for shell and cards and ReciMe readability for recipe content.
- `ui-ux-pro-max` guidance:
  - Product query: `mobile household recipe organizer cooking shared family cozy premium`
  - Stack query: `mobile forms navigation accessibility recipe organizer --stack react-native`
  - Useful recommendations: premium dark text, stone/white surfaces, restrained gold/brass accents, strong contrast, no cheap visuals, accessible roles, and standard navigation patterns.
- Current code audit:
  - `App.tsx` is too large and owns too much screen UI.
  - Groups and Add screens are inline in `App.tsx`.
  - Shared visual tokens are missing, creating palette, radius, and spacing drift.

## Product Scope

Update these surfaces in one coherent visual system:

- Auth, auth hydration, and cloud loading/error gates.
- App header and top-level tab shell.
- Recipes home: search, favorites, recipe cards, empty states, and sync status.
- Groups: group list, create/rename, selected group recipes, favorites, and delete affordances.
- Add/import: link/photo entry points, import feedback, review draft form, group selection, and save/discard controls.
- Recipe detail overlay and ingredient/direction sections.
- Settings and sign-out surface.
- Shared primitives: pressable wrapper, cloud sync status, import feedback card, and swipe-to-delete row.

Out of scope for this pass:

- Import History / Retry Center UI.
- Share-into-app implementation.
- Supabase Auth, household membership, or RLS changes.
- A full React Navigation rewrite, unless a tiny compatibility step is required by the refactor.
- New paid/pro/nutrition/grocery functionality from the ReciMe references.

## Visual System

The visual foundation should feel warm, premium, and practical.

- Background: warm stone or soft off-white, not pure beige-heavy and not a one-note brown/orange theme.
- Surfaces: white or warm cream cards with subtle borders and soft shadows.
- Text: dark espresso/stone for primary text, muted warm gray for secondary text.
- Accent: restrained copper/brass for active states and primary actions. Start with `#B25B31` for active navigation and primary actions, with darker `#7A3B22` for pressed/error-adjacent emphasis when needed.
- Imagery: recipe images should be more prominent where available, especially cards and detail headers. Fallbacks should feel intentional.
- Radius: mostly 20-28px for large mobile surfaces, smaller 12-16px for chips and compact controls. Avoid nested card-on-card treatment.
- Motion/press feedback: subtle opacity/color response. Avoid layout-shifting scale animations in frequently tapped controls.
- Icons: use a consistent icon set where available, not emoji icons.

Typography should use the system stack for now unless a font package is intentionally added later. The hierarchy should borrow Airbnb's bold native-feeling titles and ReciMe's long-form recipe readability:

- Large screen titles should be bold, high contrast, and spacious.
- Recipe detail titles may be slightly more editorial, but must remain readable on mobile.
- Ingredients and directions should have generous line height and clear section labels.

## Interaction And Behavior

All existing behavior must continue to work:

- Sign-in, persisted session restore, settings, and sign-out.
- Cloud load, refresh, sync success, and sync error states.
- Recipe search, favorite groups, recipe open/edit/delete.
- Group create, rename, delete, favorite toggle, and selected group browsing.
- URL import, photo import, retry feedback, review editing, group selection, confirm save, discard, and edit existing recipe.
- Recipe detail close, edit, delete, and open source URL.
- Pull-to-refresh remains available for cloud-backed Recipes, Groups, and Add landing states.

The refresh should not introduce dead controls, visual-only affordances, or hidden workflow regressions.

## Architecture

Introduce a small design foundation before changing screens:

- Create `src/theme/` for color, spacing, radius, and typography-style constants.
- Keep the theme simple TypeScript constants; do not introduce a full design-system library.
- Use shared values in refreshed components to reduce palette and spacing drift.

Light component cleanup:

- Extract the Groups screen UI from `App.tsx` into a focused screen component.
- Extract the Add/import screen UI from `App.tsx` into a focused screen component.
- Keep data orchestration and side-effect handlers in `App.tsx` initially, passing props into screen components.
- Refresh existing components in place where they already have good boundaries, such as `RecipesHome`, `RecipeDetailScreen`, `CloudSyncStatus`, `ImportFeedbackCard`, and `SettingsScreen`.

Avoid broad rewrites:

- Do not convert the whole app to React Navigation in this pass.
- Do not move reducer or repository logic unless required for a clean screen boundary.
- Do not add a styling dependency unless it clearly reduces complexity.

## Screen Direction

### App Shell

Use a calm, native mobile shell:

- Minimal top header with a clear settings affordance.
- Bottom or tab navigation should feel more like Airbnb: clear active state, simple labels, predictable hit areas.
- Tabs should avoid visual noise and preserve current three destinations: Recipes, Groups, Add.

### Recipes

Recipes is the proof screen for the new direction:

- Strong title and search treatment.
- Recipe cards should feel image-forward when a hero image exists, with refined fallbacks when not.
- Favorite groups should feel like useful quick filters/shortcuts.
- Sync status should be reassuring and compact, not dominant.

### Groups

Groups should become a better household organization surface:

- Favorite groups appear clearly but not separately enough to duplicate content.
- Create and rename controls should feel native and compact.
- Selected group recipes should use the same recipe-card language as Recipes where practical.

### Add / Import

Add should feel like a premium workflow launcher:

- Link and photo import surfaces are clear and compact.
- Import feedback cards stay visible and actionable.
- The review form should be easier to scan, with stronger section breaks and full-width mobile-friendly controls.
- Group selection chips should be clear, tappable, and high contrast.

### Recipe Detail

Recipe detail should take the most from ReciMe:

- Hero image or intentional fallback.
- Clear recipe title and metadata.
- Action row for edit/delete/source should remain understandable.
- Ingredients and directions get excellent readability, spacing, and section labels.

## Accessibility And Quality

Follow the `ui-ux-pro-max` checklist adapted to React Native:

- No emoji as UI icons.
- Consistent icon treatment.
- Clear press, focus, and disabled states.
- Text contrast should meet at least 4.5:1 for normal text.
- Color is not the only indicator for selected/active states.
- Form controls have useful labels/placeholders and remain readable.
- Touch targets should be comfortably tappable.
- No overlapping text or controls on small phones.
- No horizontal scroll or clipped primary actions.

## Testing And Verification

Run:

```bash
npm test -- --runInBand
npx tsc --noEmit
```

Manual/screenshot verification should cover:

- Signed-out auth screen.
- Auth/session restore loading state.
- Recipes tab with recipes, search, favorites, and sync status.
- Recipes empty/search-empty state if reachable.
- Groups tab with create, rename, favorite toggle, selected group, and swipe delete.
- Add landing with link/photo import surfaces.
- URL/photo import error cards.
- Review draft form from top through confirm controls.
- Recipe detail overlay with image and fallback-image states.
- Settings and sign-out flow.
- Small phone viewport and at least one larger device/tablet-sized viewport.

## Implementation Order

1. Add theme constants and update shared primitives/status surfaces.
2. Refresh the shell and Recipes proof screen.
3. Extract and refresh Groups screen.
4. Extract and refresh Add/import screen.
5. Refresh Recipe Detail and Settings.
6. Run full verification and commit/push the UI refresh in coherent slices.

## Implementation Decisions

- Icons: use the existing lightweight text/symbol approach for this pass unless the implementation needs multiple new icons. If a new icon dependency is required, add `lucide-react-native` and use it consistently.
- Accent color: use copper/brass derived from the premium hybrid direction, starting with `#B25B31`.
- Fonts: use the system font stack for this pass. Do not add custom font loading in the UI refresh.
