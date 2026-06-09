# Kitchen Shelf UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh Kitchen Shelf into the selected Premium Hybrid UI direction while preserving full interactivity and reducing `App.tsx` screen UI weight.

**Architecture:** Add a small shared theme module first, then migrate existing components toward it. Keep app orchestration in `App.tsx`, but extract the inline Groups and Add screens into focused presentational screen components with typed props. Avoid broad navigation or data-layer rewrites.

**Tech Stack:** Expo React Native, TypeScript, React Native Testing Library, Jest, existing reducer/repository architecture, `ui-ux-pro-max` design guidance.

---

## File Map

- Create: `src/theme/index.ts`
  - Shared colors, spacing, radius, typography constants, and common shadow values.
- Modify: `src/components/InteractivePressable.tsx`
  - Keep pressed feedback subtle and layout-stable.
- Modify: `src/components/CloudSyncStatus.tsx`
  - Use theme colors and compact premium sync card.
- Modify: `src/components/ImportFeedbackCard.tsx`
  - Use theme colors and `InteractivePressable` for consistent press behavior.
- Modify: `src/components/recipes-home/recipes-home.tsx`
  - Refresh Recipes proof screen.
- Create: `src/components/groups/GroupsScreen.tsx`
  - Presentational Groups tab screen.
- Create: `src/components/groups/GroupsScreen.test.tsx`
  - Rendering and action tests for extracted Groups screen.
- Create: `src/components/groups/index.ts`
  - Barrel export.
- Create: `src/components/add-recipe/AddRecipeScreen.tsx`
  - Presentational Add/import/review screen.
- Create: `src/components/add-recipe/AddRecipeScreen.test.tsx`
  - Rendering and action tests for extracted Add screen.
- Create: `src/components/add-recipe/index.ts`
  - Barrel export.
- Modify: `src/components/recipe-detail/RecipeDetailScreen.tsx`
- Modify: `src/components/recipe-detail/RecipeIngredientsSection.tsx`
- Modify: `src/components/recipe-detail/RecipeDirectionsSection.tsx`
- Modify: `src/components/settings/SettingsScreen.tsx`
- Modify: `App.tsx`
  - Use theme, refreshed app shell, extracted screen components.
- Modify: relevant existing tests only where text or test structure changes.

## Task 1: Add Theme Foundation And Refresh Shared Primitives

**Files:**
- Create: `src/theme/index.ts`
- Modify: `src/components/InteractivePressable.tsx`
- Modify: `src/components/CloudSyncStatus.tsx`
- Modify: `src/components/ImportFeedbackCard.tsx`
- Test: `src/components/InteractivePressable.test.tsx`
- Test: `src/components/CloudSyncStatus.test.tsx`
- Test: `src/components/ImportFeedbackCard.test.tsx`

- [ ] **Step 1: Create the theme module**

Create `src/theme/index.ts`:

```ts
export const colors = {
  background: '#F7F2EC',
  surface: '#FFFDF9',
  surfaceWarm: '#FBF5EE',
  surfaceMuted: '#EFE6DD',
  border: '#E7D9CB',
  borderStrong: '#D8C6B6',
  text: '#211C18',
  textMuted: '#6F6258',
  textSubtle: '#8A7B70',
  accent: '#B25B31',
  accentPressed: '#7A3B22',
  accentSoft: '#F1D8C7',
  success: '#2F6F5D',
  successSoft: '#E4F1E8',
  danger: '#B33F2F',
  dangerSoft: '#FBE8E3',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 32,
  pill: 999,
} as const;

export const type = {
  eyebrow: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    lineHeight: 39,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
    lineHeight: 34,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
} as const;

export const shadows = {
  card: {
    shadowColor: '#3D2B20',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  floating: {
    shadowColor: '#3D2B20',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 5,
  },
} as const;
```

- [ ] **Step 2: Update `InteractivePressable` for stable premium feedback**

In `src/components/InteractivePressable.tsx`, keep the component API but remove layout-shifting scale from the default pressed style:

```tsx
const defaultPressedStyle: ViewStyle = {
  opacity: 0.78,
};
```

Use it in the existing `Pressable` style array. Do not change tests that depend on render props.

- [ ] **Step 3: Refresh `CloudSyncStatus` with theme values**

Replace hard-coded colors with `colors`, `radius`, and `spacing` from `src/theme`. Preserve props, `testID="cloud-sync-status-root"`, badge test IDs, and visible copy.

The status themes should map to:

```ts
loading: accent/copper
error: danger
success: success
info: muted stone
```

- [ ] **Step 4: Refresh `ImportFeedbackCard`**

Import `InteractivePressable` and use it instead of raw `Pressable` actions. Keep `accessibilityRole="alert"` and existing action labels. Replace bullet glyph guidance with simple prefixed text only if tests still pass; do not add emoji icons.

- [ ] **Step 5: Verify primitive tests**

Run:

```bash
npm test -- --runTestsByPath src/components/InteractivePressable.test.tsx src/components/CloudSyncStatus.test.tsx src/components/ImportFeedbackCard.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/theme/index.ts src/components/InteractivePressable.tsx src/components/CloudSyncStatus.tsx src/components/ImportFeedbackCard.tsx
git commit -m "feat: add kitchen shelf theme primitives"
```

## Task 2: Refresh App Shell And Recipes Proof Screen

**Files:**
- Modify: `App.tsx`
- Modify: `src/components/recipes-home/recipes-home.tsx`
- Test: `App.test.tsx`
- Test: `src/components/recipes-home/recipes-home.test.tsx`

- [ ] **Step 1: Update shell styles in `App.tsx`**

Use `colors`, `spacing`, `radius`, `type`, and `shadows` from `src/theme`. Refresh:

- `safeArea`
- auth gradient/card
- app shell padding
- header settings affordance
- tab bar and tab buttons
- shared inputs/buttons/panels/chips still used by `App.tsx`

Preserve all existing labels and test IDs.

- [ ] **Step 2: Refresh `RecipesHome` layout**

Keep `RecipesHomeProps` unchanged. Update styling to match Premium Hybrid:

- bold title and compact helper copy
- rounded search input with warm border
- favorite group tiles as warm quick-access cards
- image-forward recipe cards with stronger fallback
- empty cards that feel intentional

Preserve:

```tsx
testID={`favorite-group-tile-${group.id}`}
testID={`favorite-group-star-${group.id}`}
testID="recipe-card-fallback"
```

- [ ] **Step 3: Verify Recipes tests**

Run:

```bash
npm test -- --runTestsByPath src/components/recipes-home/recipes-home.test.tsx App.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add App.tsx src/components/recipes-home/recipes-home.tsx
git commit -m "feat: refresh app shell and recipes screen"
```

## Task 3: Extract And Refresh Groups Screen

**Files:**
- Create: `src/components/groups/GroupsScreen.tsx`
- Create: `src/components/groups/GroupsScreen.test.tsx`
- Create: `src/components/groups/index.ts`
- Modify: `App.tsx`
- Test: `App.test.tsx`

- [ ] **Step 1: Create `GroupsScreenProps`**

Create a presentational component whose props mirror the current inline Groups behavior:

```ts
type GroupsScreenProps = {
  groups: RecipeGroup[];
  orderedGroups: RecipeGroup[];
  selectedGroup: RecipeGroup | null;
  recipesForSelectedGroup: RecipeRecord[];
  newGroupName: string;
  renameGroupName: string;
  syncError: string | null;
  isRefreshing: boolean;
  refreshControl?: React.ReactElement;
  groupedRecipeCount: (groupId: string) => number;
  onNewGroupNameChange: (value: string) => void;
  onRenameGroupNameChange: (value: string) => void;
  onCreateGroup: () => void;
  onRenameGroup: () => void;
  onSelectGroup: (groupId: string) => void;
  onToggleGroupFavorite: (group: RecipeGroup) => void;
  onDeleteGroup: (group: RecipeGroup) => void;
  onRecipePress: (recipeId: string) => void;
  onRecipeDelete: (recipe: RecipeRecord) => void;
};
```

- [ ] **Step 2: Move the existing Groups JSX into `GroupsScreen`**

Use the existing UI behavior from `App.tsx`, but apply theme styling. Preserve test IDs:

```tsx
testID="groups-scroll-view"
testID={`group-delete-${group.id}`}
testID={`group-content-${group.id}`}
testID={`groups-favorite-button-${group.id}`}
testID={`group-recipe-delete-${recipe.id}`}
testID={`group-recipe-content-${recipe.id}`}
```

- [ ] **Step 3: Add focused component tests**

In `GroupsScreen.test.tsx`, render with two groups and one selected recipe. Assert:

- title `Groups` renders
- pressing `Add` calls `onCreateGroup`
- pressing a group row calls `onSelectGroup`
- pressing favorite calls `onToggleGroupFavorite`
- selected group recipe appears

- [ ] **Step 4: Wire `App.tsx` to `GroupsScreen`**

Replace the inline Groups `ScrollView` block with:

```tsx
<GroupsScreen
  groups={state.groups}
  orderedGroups={orderedGroups}
  selectedGroup={selectedGroup}
  recipesForSelectedGroup={selectedGroup ? recipesForGroup(state, selectedGroup.id) : []}
  newGroupName={newGroupName}
  renameGroupName={renameGroupName}
  syncError={syncError}
  isRefreshing={isRefreshing}
  refreshControl={cloudRepository ? <RefreshControl refreshing={isRefreshing} onRefresh={() => void reloadCloudState({ showRefreshing: true })} /> : undefined}
  groupedRecipeCount={groupedRecipeCount}
  onNewGroupNameChange={setNewGroupName}
  onRenameGroupNameChange={setRenameGroupName}
  onCreateGroup={handleCreateGroup}
  onRenameGroup={handleRenameGroup}
  onSelectGroup={setSelectedGroupId}
  onToggleGroupFavorite={(group) => void handleToggleGroupFavorite(group)}
  onDeleteGroup={confirmDeleteGroup}
  onRecipePress={setSelectedRecipeId}
  onRecipeDelete={confirmDeleteRecipe}
/>
```

- [ ] **Step 5: Verify Groups tests**

Run:

```bash
npm test -- --runTestsByPath src/components/groups/GroupsScreen.test.tsx App.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add App.tsx src/components/groups
git commit -m "feat: extract refreshed groups screen"
```

## Task 4: Extract And Refresh Add / Import Screen

**Files:**
- Create: `src/components/add-recipe/AddRecipeScreen.tsx`
- Create: `src/components/add-recipe/AddRecipeScreen.test.tsx`
- Create: `src/components/add-recipe/index.ts`
- Modify: `App.tsx`
- Test: `App.test.tsx`

- [ ] **Step 1: Export Add screen helper types from `App.tsx` or define locally**

Use a local exported type in `AddRecipeScreen.tsx`:

```ts
export type EditableReviewDraft = RecipeDraft & {
  selectedGroupIds: string[];
};
```

Then update `App.tsx` to import this type and remove the local duplicate.

- [ ] **Step 2: Create `AddRecipeScreenProps`**

The component should receive all state and callbacks currently used by the Add inline JSX:

```ts
type AddRecipeScreenProps = {
  groups: RecipeGroup[];
  reviewDraft: EditableReviewDraft | null;
  urlInput: string;
  importError: string | null;
  lastImportSourceType: ImportFeedbackSourceType | null;
  isImportingUrl: boolean;
  isImportingPhoto: boolean;
  refreshControl?: React.ReactElement;
  onUrlInputChange: (value: string) => void;
  onBeginUrlReview: () => void;
  onBeginPhotoReview: (mode: 'camera' | 'library') => void;
  onRetryImport: () => void;
  onDismissImportError: () => void;
  onReviewDraftChange: (draft: EditableReviewDraft) => void;
  onBackToImport: () => void;
  onDiscardDraft: () => void;
  onSaveRecipe: () => void;
};
```

- [ ] **Step 3: Move Add JSX into `AddRecipeScreen`**

Preserve behavior and copy:

- link import panel
- photo import panel
- URL/photo `ImportFeedbackCard`
- review draft form
- group selection chips
- save/discard controls

Preserve:

```tsx
testID="add-scroll-view"
placeholder="https://example.com/cacio-e-pepe"
text "Review import"
text "Confirm recipe"
```

- [ ] **Step 4: Add focused Add screen tests**

In `AddRecipeScreen.test.tsx`, assert:

- landing renders link and photo panels
- URL input calls `onUrlInputChange`
- pressing `Create review draft` calls `onBeginUrlReview`
- review draft mode renders title field and `Confirm recipe`
- pressing a group chip updates via `onReviewDraftChange`

- [ ] **Step 5: Wire `App.tsx` to `AddRecipeScreen`**

Replace the inline Add block with `AddRecipeScreen`. Use:

```tsx
onBackToImport={() => {
  skipNextAutoRefreshTargetRef.current = 'add';
  setReviewDraft(null);
  setActiveImportJobId(null);
  setEditingRecipeId(null);
}}
```

Use the same callback for discard.

- [ ] **Step 6: Verify Add tests**

Run:

```bash
npm test -- --runTestsByPath src/components/add-recipe/AddRecipeScreen.test.tsx App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add App.tsx src/components/add-recipe
git commit -m "feat: extract refreshed add recipe screen"
```

## Task 5: Refresh Detail, Settings, And Final Verification

**Files:**
- Modify: `src/components/recipe-detail/RecipeDetailScreen.tsx`
- Modify: `src/components/recipe-detail/RecipeIngredientsSection.tsx`
- Modify: `src/components/recipe-detail/RecipeDirectionsSection.tsx`
- Modify: `src/components/settings/SettingsScreen.tsx`
- Test: existing related tests

- [ ] **Step 1: Refresh Recipe Detail**

Use the ReciMe reference for readability:

- stronger image/fallback header
- clear metadata cards
- warm group chips
- action buttons with clear destructive treatment
- ingredient/direction sections with generous line height

Preserve all test IDs and callbacks.

- [ ] **Step 2: Refresh Settings**

Use the same stone/cream/copper visual system. Preserve:

```tsx
testID="settings-screen"
accessibilityLabel="Close settings"
accessibilityLabel="Sign out"
```

- [ ] **Step 3: Run targeted tests**

Run:

```bash
npm test -- --runTestsByPath src/components/recipe-detail/RecipeDetailScreen.test.tsx src/components/settings/SettingsScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test -- --runInBand
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Manual visual pass**

Run:

```bash
npm run ios
```

Check:

- signed-out auth
- Recipes tab
- Groups tab
- Add landing
- review draft
- recipe detail
- settings

- [ ] **Step 6: Commit**

```bash
git add src/components/recipe-detail src/components/settings
git commit -m "feat: refresh detail and settings surfaces"
```

## Task 6: Final Branch Hygiene

**Files:**
- Modify only if needed: `docs/superpowers/plans/2026-06-06-kitchen-shelf-ui-refresh.md`

- [ ] **Step 1: Check status**

Run:

```bash
git status --short --branch
```

Expected: only known untracked historical plan docs remain, or a clean tree.

- [ ] **Step 2: Push**

Run:

```bash
git push
```

Expected: branch `codex/supabase-sync` pushes to GitHub.

- [ ] **Step 3: Report verification**

Report commit SHAs, pushed branch, and verification commands.
