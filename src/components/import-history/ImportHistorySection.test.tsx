import { fireEvent, render, screen } from '@testing-library/react-native';

import { ImportHistorySection } from './ImportHistorySection';

const failedJob = {
  id: 'job-failed',
  sourceType: 'url' as const,
  sourceUrl: 'https://example.com/fail',
  sourcePhotoUris: [],
  title: 'Broken recipe link',
  status: 'failed' as const,
  errorMessage: 'No recipe found in the provided text.',
  createdAt: '2026-04-05T10:00:00.000Z',
  updatedAt: '2026-04-05T10:00:00.000Z',
};

describe('ImportHistorySection', () => {
  it('renders failed, in-review, and saved sections with actions', () => {
    const onRetry = jest.fn();
    const onResume = jest.fn();
    const onOpenRecipe = jest.fn();

    render(
      <ImportHistorySection
        failed={[failedJob]}
        inReview={[
          {
            ...failedJob,
            id: 'job-review',
            status: 'in_review',
            title: 'Draft recipe',
          },
        ]}
        saved={[
          {
            ...failedJob,
            id: 'job-saved',
            status: 'saved',
            title: 'Saved recipe',
            recipeId: 'recipe-1',
          },
        ]}
        onRetry={onRetry}
        onResume={onResume}
        onOpenRecipe={onOpenRecipe}
      />
    );

    expect(screen.getByText('Import history')).toBeTruthy();
    expect(screen.getByText('Needs attention')).toBeTruthy();
    expect(screen.getByText('In review')).toBeTruthy();
    expect(screen.getByText('Recently saved')).toBeTruthy();
    expect(screen.getByText('Saved to your shared library.')).toBeTruthy();
    expect(screen.queryByText('Saved into the library as recipe-1.')).toBeNull();

    fireEvent.press(screen.getByText('Retry'));
    fireEvent.press(screen.getByText('Resume review'));
    fireEvent.press(screen.getByText('Open recipe'));

    expect(onRetry).toHaveBeenCalledWith('job-failed');
    expect(onResume).toHaveBeenCalledWith('job-review');
    expect(onOpenRecipe).toHaveBeenCalledWith('recipe-1');
  });
});
