import { fireEvent, render, screen } from '@testing-library/react-native';

import type { PendingSharedImport } from '../features/shared-imports/types';
import { SharedImportQueue } from './SharedImportQueue';

const readyItem: PendingSharedImport = {
  id: 'share-ready',
  status: 'ready',
  sourceKind: 'url',
  sourceLabel: 'skinnytaste.com',
  payload: { url: 'https://www.skinnytaste.com/mushroom-risotto' },
  draft: {
    title: 'Mushroom Risotto',
    sourceType: 'url',
    sourceUrl: 'https://www.skinnytaste.com/mushroom-risotto',
    sourcePhotoUris: [],
    ingredients: ['Rice'],
    instructions: ['Cook'],
    status: 'needs_review',
  },
  createdAt: '2026-06-07T10:00:00.000Z',
  updatedAt: '2026-06-07T10:01:00.000Z',
};

const failedItem: PendingSharedImport = {
  id: 'share-failed',
  status: 'failed',
  sourceKind: 'text',
  sourceLabel: 'Instagram caption',
  payload: { text: 'recipe caption' },
  errorMessage: 'We could not process that shared import.',
  createdAt: '2026-06-07T10:02:00.000Z',
  updatedAt: '2026-06-07T10:03:00.000Z',
};

describe('SharedImportQueue', () => {
  it('renders ready shared imports and opens them for review', () => {
    const onOpen = jest.fn();

    render(
      <SharedImportQueue
        items={[readyItem]}
        onOpen={onOpen}
        onRetry={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('Shared imports')).toBeTruthy();
    expect(screen.getByText('Mushroom Risotto')).toBeTruthy();
    expect(screen.getByText('www.skinnytaste.com/mushroom-risotto')).toBeTruthy();

    fireEvent.press(screen.getByText('Review draft'));
    expect(onOpen).toHaveBeenCalledWith('share-ready');
  });

  it('renders failed imports with retry and dismiss actions', () => {
    const onRetry = jest.fn();
    const onDismiss = jest.fn();

    render(
      <SharedImportQueue
        items={[failedItem]}
        onOpen={jest.fn()}
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Needs attention')).toBeTruthy();
    expect(screen.getByText('We could not process that shared import.')).toBeTruthy();

    fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledWith('share-failed');

    fireEvent.press(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledWith('share-failed');
  });

  it('renders nothing when there are no shared imports', () => {
    const { toJSON } = render(
      <SharedImportQueue items={[]} onOpen={jest.fn()} onRetry={jest.fn()} onDismiss={jest.fn()} />
    );

    expect(toJSON()).toBeNull();
  });
});
