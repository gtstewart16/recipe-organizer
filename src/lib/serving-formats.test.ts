import { parseServings } from './serving-scaling';

describe('imported serving formats', () => {
  it.each([
    'Serving: 4', 'Serving(s): 4', 'SERVING(S): 4',
    '4 portion(s)', '4 person(s)',
    '4 servings.', 'Serves 4.', 'Yield: 4 serving(s).',
    '4\u00a0servings', '4\u202fservings', '\n4 servings\n',
    'Servings:4', 'Yields: 4', 'Makes 4 bowls',
  ])('recognizes an explicit whole-number yield: %s', (value) => {
    expect(parseServings(value)).toBe(4);
  });

  it.each([
    '4-6', '4 — 6', '4/6', '4.5', '4½', '4 ½ servings', '4 servings..',
    '4 to six servings', '4 or six servings', '4 and a half servings',
    '4 servings (2 cups each)', '4 servings, 8 pieces',
    'about 4', 'Approx. 4 servings', '4-inch cake',
    '0 serving(s)', '1000 portions', 'NaN', 'Infinity',
  ])('does not silently choose an ambiguous or invalid count: %s', (value) => {
    expect(parseServings(value)).toBeNull();
  });

  it('recognizes every supported whole-number count', () => {
    for (let count = 1; count <= 999; count += 1) {
      expect(parseServings(`${count} serving(s)`)).toBe(count);
    }
  });
});
