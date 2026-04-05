import {
  createPendingSharedImport,
  markSharedImportFailed,
  markSharedImportReady,
  type PendingSharedImport,
} from './types';

describe('shared import record helpers', () => {
  it('creates a pending url import with timestamps and payload metadata', () => {
    const record = createPendingSharedImport({
      id: 'share-1',
      sourceKind: 'url',
      sourceLabel: 'instagram.com',
      payload: { url: 'https://instagram.com/reel/abc123' },
      createdAt: '2026-04-05T10:00:00.000Z',
    });

    expect(record).toEqual<PendingSharedImport>({
      id: 'share-1',
      status: 'pending',
      sourceKind: 'url',
      sourceLabel: 'instagram.com',
      payload: { url: 'https://instagram.com/reel/abc123' },
      createdAt: '2026-04-05T10:00:00.000Z',
      updatedAt: '2026-04-05T10:00:00.000Z',
      errorMessage: undefined,
      draft: undefined,
    });
  });

  it('marks a queue item ready with a review draft snapshot', () => {
    const ready = markSharedImportReady(
      createPendingSharedImport({
        id: 'share-2',
        sourceKind: 'text',
        sourceLabel: 'Instagram caption',
        payload: { text: 'Ingredients: 1 lb chicken\nInstructions: Cook it.' },
        createdAt: '2026-04-05T10:00:00.000Z',
      }),
      {
        title: 'Chicken',
        sourceType: 'shared_text',
        sourcePhotoUris: [],
        ingredients: ['1 lb chicken'],
        instructions: ['Cook it.'],
        status: 'needs_review',
      },
      '2026-04-05T10:02:00.000Z'
    );

    expect(ready.status).toBe('ready');
    expect(ready.draft?.sourceType).toBe('shared_text');
    expect(ready.updatedAt).toBe('2026-04-05T10:02:00.000Z');
  });

  it('marks a queue item failed without losing the original payload', () => {
    const failed = markSharedImportFailed(
      createPendingSharedImport({
        id: 'share-3',
        sourceKind: 'text',
        sourceLabel: 'Shared text',
        payload: { text: 'not a recipe' },
        createdAt: '2026-04-05T10:00:00.000Z',
      }),
      'This share does not appear to contain a recipe.',
      'unsupported',
      '2026-04-05T10:03:00.000Z'
    );

    expect(failed.status).toBe('unsupported');
    expect(failed.errorMessage).toBe('This share does not appear to contain a recipe.');
    expect(failed.payload).toEqual({ text: 'not a recipe' });
  });
});
