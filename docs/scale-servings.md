# Scale servings

Branch: `scale-servings` (Git does not allow spaces in branch names).

## Scope

Replace the recipe detail's static serving value with a rounded minus/count/plus control, using the existing warm colors and pressable components. Each tap changes the count by one, between 1 and 999. A reset action appears when the count differs from the saved recipe. The control has its own row so the buttons retain 44-point touch targets on phones; prep and cook remain together underneath.

Compute ingredient quantities from the original text and the ratio of selected to original servings. Support leading whole numbers, decimals, slash fractions, mixed fractions, Unicode fractions, quantity ranges, and compound quantities with common units (for example “1/4 cup plus 2 tbsp”). Show up to two decimal places, like the supplied examples; positive amounts below 0.01 display `<0.01`. Return the original text verbatim at the original serving count.

Keep ingredient names, preparation text, package sizes, section headings, and unquantified items such as “salt to taste” intact. Dimension prefixes such as “1-inch” and unsupported quantities remain unchanged. This is a conservative text parser, not a full natural-language ingredient interpreter: other quantities embedded later in a sentence, parenthetical alternative measurements, spelled-out numbers, and thousands separators are not scaled.

Accept a whole-number serving count (including “Serves 6”, “6 servings”, or “6 people”). If the count is missing, ambiguous, or outside 1–999, retain its text and show an instruction to edit it before scaling.

Scaling is local to the open recipe view. It never writes the selected count or scaled quantities to storage. Closing/reopening, switching recipes, or changing the original ingredients/count resets scaling. Instructions and cooking times are unchanged. No database changes, unit conversion, pantry matching, or ingredient inventory are included.

## Verification

Automated coverage: serving-count parsing; six-to-eight scaling; halving; decimal and fraction formats; ranges; package sizes; unsupported text; tiny quantities; controls; reset; limits; immutable source recipe; switching/editing/reopening recipes. Run `npm run check` for the complete test suite and TypeScript check.

Native simulator evidence is saved under `tmp/scale-servings/`: Turkey Meatloaf scaled from 4 to 8 (including both ketchup quantities), Reset restored original fractions, and reducing to 1 disabled minus. The existing photo changes in this checkout were preserved.

Manual check: open a six-serving recipe with `1 lb turkey`, `1/2 tsp salt`, and `2 tbsp milk`. Tap plus twice: expect 8 servings and `1.33`, `0.67`, and `2.67`. Tap Reset, reduce to 1, and confirm minus disables. Close and reopen to confirm the saved six-serving amounts return.

## Local testing

From the repository root, start the iOS development build with local-only storage:

```sh
EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL='' EXPO_PUBLIC_SUPABASE_ANON_KEY='' EXPO_PUBLIC_SUPABASE_IMPORT_FUNCTION_URL='' npx expo start --dev-client --localhost --port 8081 --clear
```

Press `i` in that terminal to open an installed development build in the iOS simulator. If prompted to sign in, use the local demo credentials documented in README: `home@kitchen.test` / `password123`.

Release builds intentionally require cloud configuration; use a development build for local-only testing.

Local-launch prerequisite fixed in this branch: the share-extension plugin now evaluates both the React Native and Expo URL handlers. Previously, React Native's successful return skipped Expo's development-client handler and left a blank screen. The plugin also upgrades already-generated delegates, and its regression test checks the result and idempotency. This machine's generated iOS delegate and installed development build include the correction. On another checkout, regenerate/build native files with `npx expo prebuild --platform ios` and `npx expo run:ios` before starting the local-only server above.

The environment overrides apply only to this process; they do not edit `.env`. For a physical phone, omit `--localhost` and connect the development build on the same Wi-Fi network using the displayed QR code. A TestFlight build does not load this local JavaScript.
