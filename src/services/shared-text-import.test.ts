import { importRecipeFromSharedText } from './shared-text-import';

describe('importRecipeFromSharedText', () => {
  it('returns a review draft when the normalizer produces a structured recipe', async () => {
    const draft = await importRecipeFromSharedText(
      'Crispy salmon bowl\nIngredients: 2 salmon fillets\nInstructions: Roast and serve.',
      {
        normalizer: async () => ({
          isRecipe: true,
          title: 'Crispy Salmon Bowl',
          ingredients: ['2 salmon fillets'],
          instructions: ['Roast and serve.'],
          servings: '2',
        }),
      }
    );

    expect(draft.title).toBe('Crispy Salmon Bowl');
    expect(draft.sourceType).toBe('shared_text');
    expect(draft.ingredients).toEqual(['2 salmon fillets']);
    expect(draft.instructions).toEqual(['Roast and serve.']);
    expect(draft.servings).toBe('2');
  });

  it('throws a friendly error when the normalizer says the text is not a recipe', async () => {
    await expect(
      importRecipeFromSharedText('baseball highlights', {
        normalizer: async () => ({
          isRecipe: false,
          error: 'This share does not appear to contain a recipe.',
        }),
      })
    ).rejects.toThrow('This share does not appear to contain a recipe.');
  });
});
