import {
  createPendingSharedImport,
  markSharedImportFailed,
  markSharedImportReady,
  type PendingSharedImport,
} from './types';
import { createPersistedSharedImportStore } from './store';

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

describe('persisted shared import store', () => {
  it('saves, lists, and removes shared import records', async () => {
    const storage = createMemoryStorage();
    const store = createPersistedSharedImportStore(storage);
    const record = createPendingSharedImport({
      id: 'share-1',
      sourceKind: 'url',
      payload: { url: 'https://example.com/cacio-e-pepe' },
      createdAt: '2026-04-05T10:00:00.000Z',
    });

    await store.save(record);

    expect(await store.list()).toEqual([record]);

    await store.remove('share-1');

    expect(await store.list()).toEqual([]);
  });

  it('replaces one existing record without dropping other queue items', async () => {
    const storage = createMemoryStorage();
    const store = createPersistedSharedImportStore(storage);
    const first = createPendingSharedImport({
      id: 'share-1',
      sourceKind: 'url',
      payload: { url: 'https://example.com/cacio-e-pepe' },
      createdAt: '2026-04-05T10:00:00.000Z',
    });
    const second = createPendingSharedImport({
      id: 'share-2',
      sourceKind: 'text',
      payload: { text: 'Ingredients: rice' },
      createdAt: '2026-04-05T10:01:00.000Z',
    });

    await store.saveMany([first, second]);

    const didReplace = await store.replaceExisting({ ...first, status: 'processing' });

    expect(didReplace).toBe(true);
    expect(await store.list()).toEqual([
      expect.objectContaining({ id: 'share-2', status: 'pending' }),
      expect.objectContaining({ id: 'share-1', status: 'processing' }),
    ]);
  });

  it('does not resurrect a record that has already been dismissed', async () => {
    const storage = createMemoryStorage();
    const store = createPersistedSharedImportStore(storage);
    const record = createPendingSharedImport({
      id: 'share-1',
      sourceKind: 'url',
      payload: { url: 'https://example.com/cacio-e-pepe' },
      createdAt: '2026-04-05T10:00:00.000Z',
    });

    const didReplace = await store.replaceExisting(record);

    expect(didReplace).toBe(false);
    expect(await store.list()).toEqual([]);
  });
});

function createMemoryStorage() {
  let value: string | null = null;

  return {
    getItem: jest.fn(async () => value),
    setItem: jest.fn(async (_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}
