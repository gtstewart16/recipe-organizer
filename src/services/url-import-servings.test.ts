import { importRecipeFromUrl } from './url-import';
import { parseServings, scaleIngredient } from '../lib/serving-scaling';

describe('serving counts through URL import', () => {
  it.each([
    { yield: 4, expected: 4 },
    { yield: [4], expected: 4 },
    { yield: [null, 4, '4 servings'], expected: 4 },
    { yield: ['4–6', 4], expected: null },
    { yield: [4, '4–6'], expected: null },
    { yield: [4, '4.5 servings'], expected: null },
    { yield: '4', expected: 4 },
    { yield: '4 serving(s)', expected: 4 },
    { yield: ['4', '4 servings'], expected: 4 },
    { yield: ['4 serving(s)'], expected: 4 },
    { yield: '4–6', expected: null },
    { yield: 4.5, expected: null },
    { yield: 0, expected: null },
    { yield: null, expected: null },
  ])('keeps yield $yield usable without guessing', async ({ yield: recipeYield, expected }) => {
    const schema = {
      '@type': 'Recipe', name: 'Serving test', recipeYield,
      recipeIngredient: ['1 lb beef'], recipeInstructions: ['Cook.'],
    };
    const draft = await importRecipeFromUrl('https://example.com/recipe', {
      fetcher: async () => new Response(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`),
    });
    expect(parseServings(draft.servings)).toBe(expected);
    if (expected !== null) {
      expect(scaleIngredient(draft.ingredients[0], (expected + 1) / expected)).toBe('1.25 lb beef');
    }
  });
});
