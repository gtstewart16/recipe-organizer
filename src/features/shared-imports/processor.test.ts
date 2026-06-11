import { processPendingSharedImport } from './processor';
import { createPendingSharedImport } from './types';

describe('processPendingSharedImport', () => {
  it('turns a pending url share into a ready queue item', async () => {
    const result = await processPendingSharedImport(
      createPendingSharedImport({
        id: 'share-1',
        sourceKind: 'url',
        payload: { url: 'https://example.com/cacio-e-pepe' },
        createdAt: '2026-04-05T10:00:00.000Z',
      }),
      {
        importFromUrl: async () => ({
          title: 'Cacio e Pepe',
          sourceType: 'url',
          sourceUrl: 'https://example.com/cacio-e-pepe',
          sourcePhotoUris: [],
          ingredients: ['Pasta'],
          instructions: ['Cook'],
          status: 'needs_review',
        }),
      }
    );

    expect(result.status).toBe('ready');
    expect(result.draft?.title).toBe('Cacio e Pepe');
    expect(result.errorMessage).toBeUndefined();
  });

  it('marks unsupported text when parsing rejects as not-a-recipe', async () => {
    const result = await processPendingSharedImport(
      createPendingSharedImport({
        id: 'share-2',
        sourceKind: 'text',
        payload: { text: 'baseball highlights' },
        createdAt: '2026-04-05T10:00:00.000Z',
      }),
      {
        importFromText: async () => {
          throw new Error('This share does not appear to contain a recipe.');
        },
      }
    );

    expect(result.status).toBe('unsupported');
    expect(result.errorMessage).toBe('This share does not appear to contain a recipe.');
  });

  it('keeps failed url shares retryable with their original payload', async () => {
    const result = await processPendingSharedImport(
      createPendingSharedImport({
        id: 'share-3',
        sourceKind: 'url',
        payload: { url: 'https://example.com/broken' },
        createdAt: '2026-04-05T10:00:00.000Z',
      }),
      {
        importFromUrl: async () => {
          throw new Error('Network request failed');
        },
      }
    );

    expect(result.status).toBe('failed');
    expect(result.payload).toEqual({ url: 'https://example.com/broken' });
    expect(result.errorMessage).toBe('Network request failed');
  });

  it('shows a retryable user message when OpenAI rate limits normalization', async () => {
    const result = await processPendingSharedImport(
      createPendingSharedImport({
        id: 'share-4',
        sourceKind: 'url',
        payload: { url: 'https://www.skinnytaste.com/chicken-corn-chowder' },
        createdAt: '2026-04-05T10:00:00.000Z',
      }),
      {
        importFromUrl: async () => {
          throw new Error(
            'OpenAI normalization failed: { "error": { "message": "Rate limit reached for gpt-4.1-mini in organization org-example on tokens per min (TPM): Limit 200000, Used 200000, Requested 119506. Please try again in 35.851s.", "type": "tokens", "code": "rate_limit_exceeded" } }'
          );
        },
      }
    );

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toBe(
      'Kitchen Shelf hit the recipe parser rate limit. Please wait about 36 seconds, then tap Try again.'
    );
    expect(result.errorMessage).not.toContain('gpt-4.1-mini');
    expect(result.errorMessage).not.toContain('org-example');
  });
});
