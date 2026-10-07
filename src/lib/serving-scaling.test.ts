import { parseServings, scaleIngredient } from './serving-scaling';

describe('parseServings', () => {
  it.each(['6', '6 servings', 'Serves 6', ' 6 people '])('reads %s', (value) => {
    expect(parseServings(value)).toBe(6);
  });
  it.each([
    ['6 stuffed artichoke bottoms', 6],
    ['12 cookies', 12],
    ['10 slices', 10],
    ['6 tacos', 6],
    ['Makes 6 stuffed artichoke bottoms', 6],
    ['Yield: 6 stuffed artichoke bottoms', 6],
    ['Serves 6 people', 6],
    ['6 single-serve bowls', 6],
  ])('reads a descriptive imported yield: %s', (value, expected) => {
    expect(parseServings(value)).toBe(expected);
  });
  it.each([undefined, '', '0', '-2', '4–6', '4 - 6 servings', '4 to 6 servings', '4 or 6 servings', '4 to six servings', 'about 6', '1/2', '1 1/2 servings', '6.5 servings', '6½ servings', '1000', '6 servings of 2 pieces', '6-inch cake'])('does not guess %s', (value) => {
    expect(parseServings(value)).toBeNull();
  });
});

describe('scaleIngredient', () => {
  it.each([
    ['150 g flour (1 cup plus 2 tbsp)', '300 g flour (1 cup plus 2 tbsp)'],
    ['150 g flour (1 cup (sifted) plus 2 tbsp) plus 1 tbsp', '300 g flour (1 cup (sifted) plus 2 tbsp) plus 2 tbsp'],
    ['1 cup flour plus 1–2 tbsp for dusting', '2 cup flour plus 2–4 tbsp for dusting'],
    ['1 cup flour and 1/2 to 1 tbsp for dusting', '2 cup flour and 1 to 2 tbsp for dusting'],
    ['1 cup flour plus ½–¾ cup milk plus 1 egg', '2 cup flour plus 1–1.5 cup milk plus 2 egg'],
  ])('scales outer compound amounts while preserving parentheses: %s', (input, expected) => {
    expect(scaleIngredient(input, 2)).toBe(expected);
  });
  it.each([
    ['1 lb ground turkey', '1.33 lb ground turkey'],
    ['1/2 tsp salt', '0.67 tsp salt'],
    ['¼ cup yogurt', '0.33 cup yogurt'],
    ['2 tbsp milk', '2.67 tbsp milk'],
    ['1 1/2 cups flour', '2 cups flour'],
    ['1½ cups flour', '2 cups flour'],
    ['1-1/2 cups flour', '2 cups flour'],
    ['1–2 cloves garlic', '1.33–2.67 cloves garlic'],
    ['1/2 to 1 tsp pepper', '0.67 to 1.33 tsp pepper'],
    ['200g flour', '266.67g flour'],
    ['2 (14 oz) cans tomatoes', '2.67 (14 oz) cans tomatoes'],
    ['1/4 cup plus 2 tbsp ketchup', '0.33 cup plus 2.67 tbsp ketchup'],
    ['1 egg and 2 yolks', '1.33 egg and 2.67 yolks'],
    ['  0.75 cup rice', '  1 cup rice'],
  ])('scales %s from six to eight servings', (input, expected) => {
    expect(scaleIngredient(input, 8 / 6)).toBe(expected);
  });
  it.each(['Salt to taste', 'CREMA:', '1/0 cup flour', '1-inch ginger piece', '½-inch ginger piece', '1,000 g flour', '2% milk', '100% whole wheat flour', '1" piece ginger', '1″ piece ginger'])('preserves unsupported text: %s', (input) => {
    expect(scaleIngredient(input, 2)).toBe(input);
  });
  it('halves amounts', () => {
    expect(scaleIngredient('1 1/2 cups flour', 0.5)).toBe('0.75 cups flour');
  });
  it('restores exact source formatting at the original serving count', () => {
    expect(scaleIngredient('½ tsp salt', 1)).toBe('½ tsp salt');
  });
  it('does not round small positive amounts to zero', () => {
    expect(scaleIngredient('1/8 tsp salt', 1 / 100)).toBe('<0.01 tsp salt');
  });
});
