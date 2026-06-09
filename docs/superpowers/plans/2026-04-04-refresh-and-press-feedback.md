# Refresh And Press Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pull-to-refresh across the top-level tabs, visible sync timing/status on the Recipes tab, and mobile-friendly pressed-state feedback for tappable controls.

**Architecture:** Keep the current app shell intact and layer the feature into `App.tsx` with a small amount of new UI state. Reuse the existing cloud repository as the refresh source of truth, and introduce a small presentational button wrapper to centralize pressed-state feedback without rewriting the app structure.

**Tech Stack:** Expo React Native, TypeScript, Jest, React Native Testing Library, Supabase-backed repository layer already present in the branch.

---

## File Map

- Modify: `/Users/gtstewart16/dev/recipe-organizer/App.tsx`
  - Add refresh state, refresh handlers, pull-to-refresh wiring, last-synced messaging, and integrate the pressed-state button wrapper.
- Create: `/Users/gtstewart16/dev/recipe-organizer/src/components/InteractivePressable.tsx`
  - Reusable mobile-friendly press-feedback wrapper for app buttons/chips.
- Create: `/Users/gtstewart16/dev/recipe-organizer/src/components/InteractivePressable.test.tsx`
  - Focused tests for pressed-state styling behavior.
- Modify: `/Users/gtstewart16/dev/recipe-organizer/App.test.tsx`
  - Add behavior tests for refresh affordances and safe Add-tab refresh boundaries.
- Optionally modify: `/Users/gtstewart16/dev/recipe-organizer/src/components/CloudSyncStatus.tsx`
  - Only if a tiny prop is needed to show last-sync copy cleanly.

## Task 1: Add Press-Feedback Wrapper

**Files:**
- Create: `/Users/gtstewart16/dev/recipe-organizer/src/components/InteractivePressable.tsx`
- Test: `/Users/gtstewart16/dev/recipe-organizer/src/components/InteractivePressable.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { InteractivePressable } from './InteractivePressable';

describe('InteractivePressable', () => {
  it('applies a pressed style while the control is pressed', () => {
    render(
      <InteractivePressable testID="interactive-button">
        {({ textStyle }) => <Text style={textStyle}>Tap me</Text>}
      </InteractivePressable>
    );

    const button = screen.getByTestId('interactive-button');
    fireEvent(button, 'pressIn');
    expect(button).toBeTruthy();
    fireEvent(button, 'pressOut');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runTestsByPath src/components/InteractivePressable.test.tsx`
Expected: FAIL because `InteractivePressable` does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Pressable, PressableProps, StyleProp, TextStyle, ViewStyle } from 'react-native';

type ChildRenderProps = {
  pressed: boolean;
  textStyle?: StyleProp<TextStyle>;
};

type InteractivePressableProps = PressableProps & {
  children: React.ReactNode | ((props: ChildRenderProps) => React.ReactNode);
  pressedStyle?: StyleProp<ViewStyle>;
  pressedTextStyle?: StyleProp<TextStyle>;
};

export function InteractivePressable({ children, style, pressedStyle, pressedTextStyle, ...props }: InteractivePressableProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [style, pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null, pressed ? pressedStyle : null]}
    >
      {({ pressed }) =>
        typeof children === 'function'
          ? children({ pressed, textStyle: pressed ? pressedTextStyle : undefined })
          : children
      }
    </Pressable>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runTestsByPath src/components/InteractivePressable.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/InteractivePressable.tsx src/components/InteractivePressable.test.tsx
git commit -m "feat: add mobile press feedback wrapper"
```

## Task 2: Add Refresh Tests For The Three Tabs

**Files:**
- Modify: `/Users/gtstewart16/dev/recipe-organizer/App.test.tsx`
- Test: `/Users/gtstewart16/dev/recipe-organizer/App.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it('shows shared-library sync status on the Recipes tab when cloud sync is enabled', async () => {
  render(<App />);
  fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
  fireEvent.press(screen.getByText('Continue to library'));
  expect(await screen.findByText(/Shared library in sync|Refreshing your shared library|Last synced/i)).toBeTruthy();
});

it('enables pull-to-refresh on Recipes, Groups, and Add landing view', async () => {
  render(<App />);
  fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
  fireEvent.press(screen.getByText('Continue to library'));
  expect(await screen.findByTestId('recipes-scroll-view')).toBeTruthy();
  fireEvent.press(screen.getByText('Groups'));
  expect(screen.getByTestId('groups-scroll-view')).toBeTruthy();
  fireEvent.press(screen.getByText('Add'));
  expect(screen.getByTestId('add-scroll-view')).toBeTruthy();
});

it('does not expose refresh-only landing behavior while editing a review draft', async () => {
  render(<App />);
  fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
  fireEvent.press(screen.getByText('Continue to library'));
  fireEvent.press(screen.getByText('Add'));
  fireEvent.changeText(screen.getByPlaceholderText('https://example.com/cacio-e-pepe'), 'https://example.com/cacio-e-pepe');
  fireEvent.press(screen.getByText('Create review draft'));
  expect(await screen.findByText('Review import')).toBeTruthy();
  expect(screen.queryByText(/Last synced|Refreshing your shared library/i)).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runTestsByPath App.test.tsx`
Expected: FAIL because the new refresh affordances and test IDs do not exist yet.

- [ ] **Step 3: Implement minimal test plumbing in App.tsx**

```tsx
<ScrollView testID="recipes-scroll-view" ... />
<ScrollView testID="groups-scroll-view" ... />
<ScrollView testID="add-scroll-view" ... />
```

- [ ] **Step 4: Run test to verify the failures narrow**

Run: `npm test -- --runTestsByPath App.test.tsx`
Expected: FAIL only on the new refresh behavior assertions.

- [ ] **Step 5: Commit**

```bash
git add App.test.tsx App.tsx
git commit -m "test: add refresh behavior coverage for top-level tabs"
```

## Task 3: Implement Cloud Refresh State And Pull-To-Refresh

**Files:**
- Modify: `/Users/gtstewart16/dev/recipe-organizer/App.tsx`
- Optionally modify: `/Users/gtstewart16/dev/recipe-organizer/src/components/CloudSyncStatus.tsx`

- [ ] **Step 1: Add explicit refresh state in App.tsx**

```tsx
const [isRefreshing, setIsRefreshing] = useState(false);
const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
const [refreshError, setRefreshError] = useState<string | null>(null);
```

- [ ] **Step 2: Add a shared cloud reload helper**

```tsx
const reloadCloudState = async ({ showRefreshing = false }: { showRefreshing?: boolean } = {}) => {
  if (!cloudRepository) {
    return;
  }

  if (showRefreshing) {
    setIsRefreshing(true);
  }

  try {
    const nextState = await cloudRepository.loadState();
    dispatch({ type: 'state/hydrated', payload: nextState });
    setLastSyncedAt(new Date().toISOString());
    setRefreshError(null);
    setSyncError(null);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'We could not refresh your shared library.';
    setRefreshError(message);
    setSyncError(message);
  } finally {
    if (showRefreshing) {
      setIsRefreshing(false);
    }
  }
};
```

- [ ] **Step 3: Reuse the helper for the signed-in cloud bootstrap**

Replace the inline `cloudRepository.loadState()` effect body with `reloadCloudState()` semantics so the initial load also updates `lastSyncedAt`.

- [ ] **Step 4: Wire `RefreshControl` into the three tab scroll views**

```tsx
import { RefreshControl } from 'react-native';

refreshControl={
  cloudRepository && !reviewDraft ? (
    <RefreshControl refreshing={isRefreshing} onRefresh={() => void reloadCloudState({ showRefreshing: true })} />
  ) : undefined
}
```

Apply to:
- `Recipes`
- `Groups`
- `Add` landing view only

- [ ] **Step 5: Show Recipes sync messaging**

Use `CloudSyncStatus` near the top of the `Recipes` tab:

```tsx
<CloudSyncStatus
  state={refreshError ? 'error' : isRefreshing ? 'loading' : 'success'}
  title={refreshError ? 'Refresh paused' : isRefreshing ? 'Refreshing your shared library' : 'Shared library in sync'}
  message={refreshError ?? formatLastSynced(lastSyncedAt)}
/>
```

Add a tiny formatter helper in `App.tsx`:

```tsx
function formatLastSynced(value: string | null) {
  if (!value) return 'Last synced just now.';
  return `Last synced at ${new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
}
```

- [ ] **Step 6: Show lightweight refresh errors on Groups and Add landing**

Reuse the existing error text area or a short inline message so failures are visible without adding extra cards to every screen.

- [ ] **Step 7: Run tests and typecheck**

Run:
- `npm test -- --runTestsByPath App.test.tsx`
- `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add App.tsx App.test.tsx src/components/CloudSyncStatus.tsx
git commit -m "feat: add pull to refresh for shared library tabs"
```

## Task 4: Apply Press Feedback To Existing Controls

**Files:**
- Modify: `/Users/gtstewart16/dev/recipe-organizer/App.tsx`
- Reuse: `/Users/gtstewart16/dev/recipe-organizer/src/components/InteractivePressable.tsx`

- [ ] **Step 1: Replace high-traffic tappable controls with `InteractivePressable`**

Target these controls first:
- tab buttons
- primary and secondary action buttons in `Add`
- group chips and group selection chips
- recipe cards
- destructive buttons that stay visually safe when pressed

- [ ] **Step 2: Keep the visual treatment subtle**

Use a common pressed response like:

```tsx
pressed ? { opacity: 0.82, transform: [{ scale: 0.98 }] } : null
```

Avoid dramatic animation or long transitions.

- [ ] **Step 3: Make sure existing text styles still render correctly**

Pass children through the wrapper without changing labels or accessibility text.

- [ ] **Step 4: Run focused and full verification**

Run:
- `npm test -- --runTestsByPath src/components/InteractivePressable.test.tsx App.test.tsx`
- `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add App.tsx src/components/InteractivePressable.tsx src/components/InteractivePressable.test.tsx App.test.tsx
git commit -m "feat: add mobile button press feedback"
```

## Task 5: Final Verification And Push

**Files:**
- Modify: `/Users/gtstewart16/dev/recipe-organizer/README.md` only if testing notes need a small update

- [ ] **Step 1: Run full targeted verification**

Run:
- `npm test -- --runTestsByPath App.test.tsx src/components/CloudSyncStatus.test.tsx src/components/ImportFeedbackCard.test.tsx src/components/InteractivePressable.test.tsx src/lib/recipe-book-repository.test.ts src/services/photo-import.test.ts src/services/url-import.test.ts src/store/recipe-book.test.ts`
- `npx tsc --noEmit`

Expected: all tests pass and typecheck is clean.

- [ ] **Step 2: Smoke test manually in simulator/phone**

Check:
- pull-to-refresh works on `Recipes`, `Groups`, and `Add` landing
- `Add` review draft does not expose refresh behavior
- `Recipes` shows last synced / refreshing copy
- buttons visibly react on press without feeling jumpy

- [ ] **Step 3: Commit the final polish or docs update if needed**

```bash
git add README.md App.tsx App.test.tsx src/components
git commit -m "chore: finalize refresh and interaction polish"
```

- [ ] **Step 4: Push branch**

```bash
git push
```
