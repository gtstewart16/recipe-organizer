# TestFlight Cloud Reconnect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconnect TestFlight build 5 to the existing Supabase household so both phones load the 18 cloud recipes and never silently create separate local-only libraries in a store build.

**Architecture:** EAS injects the three public Supabase values from its `production` environment into the `testflight` profile. A small pure runtime-mode helper distinguishes cloud, development-local, and invalid release configurations; `App.tsx` uses it to block local persistence in a misconfigured release while retaining local development and test behavior.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.9, Jest, Supabase JavaScript client, EAS Build/Submit.

---

### Task 1: Lock production persistence behavior with a failing test

**Files:**
- Create: `src/lib/persistence-mode.test.ts`
- Create: `src/lib/persistence-mode.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { resolvePersistenceMode } from './persistence-mode';

describe('resolvePersistenceMode', () => {
  it('rejects a release build that has no Supabase configuration', () => {
    expect(
      resolvePersistenceMode({
        hasCloudConfig: false,
        isDevelopment: false,
        isTest: false,
      })
    ).toBe('configuration_error');
  });

  it('uses cloud persistence whenever Supabase is configured', () => {
    expect(
      resolvePersistenceMode({
        hasCloudConfig: true,
        isDevelopment: false,
        isTest: false,
      })
    ).toBe('cloud');
  });

  it.each([
    { isDevelopment: true, isTest: false },
    { isDevelopment: false, isTest: true },
  ])('allows local persistence for development and tests', ({ isDevelopment, isTest }) => {
    expect(resolvePersistenceMode({ hasCloudConfig: false, isDevelopment, isTest })).toBe('local');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --runTestsByPath src/lib/persistence-mode.test.ts`

Expected: FAIL because `./persistence-mode` does not exist.

- [ ] **Step 3: Implement the pure resolver**

```typescript
export type PersistenceMode = 'cloud' | 'local' | 'configuration_error';

type PersistenceModeInput = {
  readonly hasCloudConfig: boolean;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
};

export function resolvePersistenceMode({
  hasCloudConfig,
  isDevelopment,
  isTest,
}: PersistenceModeInput): PersistenceMode {
  if (hasCloudConfig) {
    return 'cloud';
  }

  return isDevelopment || isTest ? 'local' : 'configuration_error';
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --runTestsByPath src/lib/persistence-mode.test.ts`

Expected: 4 passing cases, 0 failures.

### Task 2: Prevent local fallback in a misconfigured release

**Files:**
- Modify: `App.tsx`
- Test: `src/lib/persistence-mode.test.ts`

- [ ] **Step 1: Compute persistence mode once**

Import `resolvePersistenceMode`, compute it from `Boolean(supabase)`, `__DEV__`, and `process.env.NODE_ENV === 'test'`, and use `persistenceMode === 'local'` instead of `!cloudRepository` in the AsyncStorage hydration/write effects.

- [ ] **Step 2: Render a release configuration error**

Before the sign-in screen, render the existing `CloudSyncStatus` error component when `persistenceMode === 'configuration_error'`:

```tsx
<CloudSyncStatus
  state="error"
  title="Cloud library unavailable"
  message="This TestFlight build is missing its Supabase configuration. Install the next available build."
/>
```

This prevents users from entering a fresh local-only library when a release is misconfigured.

- [ ] **Step 3: Run focused and type checks**

Run: `npm test -- --runTestsByPath src/lib/persistence-mode.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: exit 0 with no diagnostics.

### Task 3: Bind TestFlight to EAS production variables

**Files:**
- Modify: `eas.json`

- [ ] **Step 1: Make the EAS environment explicit**

Set `build.testflight.environment` and `build.production.environment` to `"production"`.

- [ ] **Step 2: Create or replace the public production variables**

Read each value from the gitignored local `.env` without printing it, then run `eas env:create production --force --visibility plaintext --non-interactive` for:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_IMPORT_FUNCTION_URL`

Only these public client values are uploaded. Never upload a service-role or secret key.

- [ ] **Step 3: Verify EAS variable names without displaying values**

Run: `npx --yes eas-cli@20.1.0 env:list production --format short`

Expected: all three names appear with the production environment.

### Task 4: Run release verification

**Files:**
- Verify only

- [ ] **Step 1: Run the full repository checks**

Run: `npm run check`

Expected: all Jest suites pass and TypeScript exits 0.

- [ ] **Step 2: Verify cloud data before building**

Query Supabase for household and recipe counts.

Expected: one household named `The Kitchen` and 18 recipes.

- [ ] **Step 3: Verify public Expo configuration locally**

Run `npx expo config --type public --json` and inspect only presence booleans/domain, never the full key.

Expected: the Supabase project URL resolves to project `mmgnnyllndteknxuglir` and all three values are non-empty.

### Task 5: Build, inspect, and submit build 5

**Files:**
- External EAS build and App Store Connect submission

- [ ] **Step 1: Build the TestFlight profile**

Run: `npm run eas:build:testflight -- --non-interactive`

Expected: EAS reports that the production environment contains the three variables and finishes iOS build 5.

- [ ] **Step 2: Inspect the built IPA before submission**

Download the build artifact to a temporary path. Verify `EXConstants.bundle/app.config` contains the Supabase project URL and a non-empty client key, then remove the temporary IPA.

- [ ] **Step 3: Submit the verified build**

Run: `npm run eas:submit:testflight -- --non-interactive`

Expected: App Store Connect accepts build 5 for processing.

- [ ] **Step 4: Report installation QA**

After Apple finishes processing, install build 5 on both phones. Both should show the same 18 cloud recipes and the cloud group counts. The phone-local state is intentionally ignored.
