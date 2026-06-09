import { createPendingSharedImport } from './types';
import { createSharedImportFromDeepLink, parseSharedImportDeepLink } from './deep-link';

describe('shared import deep link parsing', () => {
  it('parses a shared recipe url from the custom app scheme', () => {
    expect(parseSharedImportDeepLink('kitchenshelf://share?url=https%3A%2F%2Fwww.skinnytaste.com%2Fmushroom-risotto')).toEqual({
      sourceKind: 'url',
      sourceLabel: 'skinnytaste.com',
      payload: { url: 'https://www.skinnytaste.com/mushroom-risotto' },
    });
  });

  it('parses shared text from the import path format', () => {
    expect(parseSharedImportDeepLink('kitchenshelf://import?text=Ingredients%3A%20rice%0AInstructions%3A%20cook')).toEqual({
      sourceKind: 'text',
      sourceLabel: 'Shared text',
      payload: { text: 'Ingredients: rice\nInstructions: cook' },
    });
  });

  it('parses Expo Go shared import URLs after the double-dash route marker', () => {
    expect(
      parseSharedImportDeepLink(
        'exp://192.168.1.15:8081/--/share?url=https%3A%2F%2Fwww.skinnytaste.com%2Fmushroom-risotto'
      )
    ).toEqual({
      sourceKind: 'url',
      sourceLabel: 'skinnytaste.com',
      payload: { url: 'https://www.skinnytaste.com/mushroom-risotto' },
    });
  });

  it('treats the payload parameter as url when it contains an absolute link', () => {
    expect(parseSharedImportDeepLink('kitchenshelf://share?payload=https%3A%2F%2Fexample.com%2Frecipe')).toEqual({
      sourceKind: 'url',
      sourceLabel: 'example.com',
      payload: { url: 'https://example.com/recipe' },
    });
  });

  it('ignores unrelated or empty deep links', () => {
    expect(parseSharedImportDeepLink('kitchenshelf://settings')).toBeNull();
    expect(parseSharedImportDeepLink('kitchenshelf://share?url=')).toBeNull();
    expect(parseSharedImportDeepLink('https://example.com/recipe')).toBeNull();
  });

  it('creates a pending shared import record with stable metadata', () => {
    expect(
      createSharedImportFromDeepLink(
        'kitchenshelf://share?text=Ingredients%3A%20rice',
        {
          createId: () => 'share-deep-link-1',
          now: () => '2026-06-07T12:00:00.000Z',
        }
      )
    ).toEqual(
      createPendingSharedImport({
        id: 'share-deep-link-1',
        sourceKind: 'text',
        sourceLabel: 'Shared text',
        payload: { text: 'Ingredients: rice' },
        createdAt: '2026-06-07T12:00:00.000Z',
      })
    );
  });
});
