import { formatRecipeImportError } from './import-error';

describe('formatRecipeImportError', () => {
  it('turns OpenAI token rate-limit payloads into concise retry guidance', () => {
    const message = formatRecipeImportError(
      new Error(
        'OpenAI normalization failed: { "error": { "message": "Rate limit reached for gpt-4.1-mini in organization org-example on tokens per min (TPM): Limit 200000, Used 200000, Requested 119506. Please try again in 35.851s.", "type": "tokens", "code": "rate_limit_exceeded" } }'
      )
    );

    expect(message).toBe(
      'Kitchen Shelf hit the recipe parser rate limit. Please wait about 36 seconds, then tap Try again.'
    );
    expect(message).not.toContain('gpt-4.1-mini');
    expect(message).not.toContain('org-example');
    expect(message).not.toContain('200000');
  });

  it('turns generic OpenAI failures into a friendly retry message', () => {
    expect(formatRecipeImportError(new Error('OpenAI normalization failed: internal parser detail'))).toBe(
      'Kitchen Shelf could not finish parsing this recipe right now. Please tap Try again in a minute.'
    );
  });

  it('falls back to the provided default when the thrown value is not an Error', () => {
    expect(formatRecipeImportError(undefined, 'We could not import that recipe link right now.')).toBe(
      'We could not import that recipe link right now.'
    );
  });
});
