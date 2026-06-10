import {
  limitRemoteNormalizationText,
  trimImportRecipeRequestForNormalization,
} from './import-input';

describe('import recipe input preparation', () => {
  it('caps oversized url text while preserving the beginning and end', () => {
    const rawText = ['Recipe title', 'intro '.repeat(8000), 'Ingredients: corn', 'Instructions: simmer.'].join(' ');

    const limited = limitRemoteNormalizationText(rawText);

    expect(limited.length).toBeLessThanOrEqual(12000);
    expect(limited).toContain('Recipe title');
    expect(limited).toContain('Ingredients: corn');
    expect(limited).toContain('Instructions: simmer.');
    expect(limited).toContain('[content truncated for import]');
  });

  it('trims url and shared text requests before normalization', () => {
    const request = trimImportRecipeRequestForNormalization({
      sourceType: 'shared_text',
      rawText: `${'caption filler '.repeat(10000)}Ingredients: beans. Instructions: toss.`,
    });

    expect(request.rawText?.length).toBeLessThanOrEqual(12000);
    expect(request.rawText).toContain('Ingredients: beans');
  });

  it('does not modify photo requests', () => {
    const request = {
      sourceType: 'photo' as const,
      sourcePhotoUris: ['file://recipe.jpg'],
      imageDataUrls: ['data:image/jpeg;base64,abc123'],
    };

    expect(trimImportRecipeRequestForNormalization(request)).toBe(request);
  });
});
