import { importRecipeFromPhoto } from './photo-import';

describe('importRecipeFromPhoto', () => {
  it('returns an AI-normalized cookbook recipe draft', async () => {
    const normalizer = jest.fn(async () => ({
      title: 'Pesto Chicken and Roasted Veggie Farro Bowls',
      ingredients: [
        '1 pound chicken cutlets, sliced in half',
        'Italian marinade',
        '1/2 cup spinach basil pesto',
        'Olive oil spray',
        '4 cups broccoli florets',
        '2 red bell peppers, cut into strips',
        '1 large red onion, quartered',
        '1/2 teaspoon kosher salt',
        '1 cup cooked farro, heated',
      ],
      instructions: [
        'Marinate the chicken for at least 4 hours or up to overnight.',
        'Prepare the pesto according to the referenced directions.',
        'Preheat the oven to 400 degrees Fahrenheit and spray a sheet pan with oil.',
        'Roast the broccoli, bell peppers, and onion for about 20 minutes, turning halfway through.',
        'Serve the farro with pesto, roasted vegetables, and sliced chicken.',
      ],
      servings: '4',
    }));

    const draft = await importRecipeFromPhoto(
      [
        {
          uri: 'file:///cookbook-page.jpg',
          mimeType: 'image/jpeg',
          base64: 'ZmFrZS1pbWFnZS1ieXRlcw==',
        },
      ],
      { normalizer }
    );

    expect(normalizer).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'photo',
        imageDataUrls: [
          'data:image/jpeg;base64,ZmFrZS1pbWFnZS1ieXRlcw==',
        ],
      })
    );
    expect(draft.title).toBe('Pesto Chicken and Roasted Veggie Farro Bowls');
    expect(draft.servings).toBe('4');
    expect(draft.ingredients).toHaveLength(9);
    expect(draft.instructions).toHaveLength(5);
    expect(draft.sourceType).toBe('photo');
  });

  it('falls back to a local placeholder when no normalizer is available', async () => {
    const draft = await importRecipeFromPhoto([
      {
        uri: 'file:///cookbook-page.jpg',
      },
    ]);

    expect(draft.title).toBe('Cookbook Recipe Draft');
    expect(draft.ingredients.length).toBeGreaterThan(0);
    expect(draft.instructions.length).toBeGreaterThan(0);
  });
});
