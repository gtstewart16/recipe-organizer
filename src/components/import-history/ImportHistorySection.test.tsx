import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ImportJob } from '../../store/recipe-book';
import { ImportHistorySection } from './ImportHistorySection';

const failedRetryableJob: ImportJob = {
  id: 'job-failed-url',
  sourceType: 'url',
  sourceUrl: 'https://example.com/broken-soup',
  sourcePhotoUris: [],
  title: 'Broken Soup',
  status: 'failed',
  errorMessage: 'The page did not include recipe instructions.',
  createdAt: '2026-04-05T10:00:00.000Z',
  updatedAt: '2026-04-05T10:00:00.000Z',
};

const failedNonRetryableJob: ImportJob = {
  id: 'job-failed-photo',
  sourceType: 'photo',
  sourcePhotoUris: [],
  title: 'Cookbook Recipe Draft',
  status: 'failed',
  errorMessage: 'The original photo is no longer available.',
  createdAt: '2026-04-05T10:01:00.000Z',
  updatedAt: '2026-04-05T10:01:00.000Z',
};

const inReviewJob: ImportJob = {
  id: 'job-review',
  sourceType: 'photo',
  sourcePhotoUris: ['file:///cookbook-page.jpg'],
  title: 'Pesto Chicken',
  status: 'in_review',
  createdAt: '2026-04-05T10:02:00.000Z',
  updatedAt: '2026-04-05T10:02:00.000Z',
};

const savedJob: ImportJob = {
  id: 'job-saved',
  sourceType: 'url',
  sourceUrl: 'https://example.com/cacio-e-pepe',
  sourcePhotoUris: [],
  title: 'Cacio E Pepe',
  status: 'saved',
  recipeId: 'recipe-42',
  createdAt: '2026-04-05T10:03:00.000Z',
  updatedAt: '2026-04-05T10:03:00.000Z',
};

const savedWithoutRecipeJob: ImportJob = {
  id: 'job-saved-missing-recipe',
  sourceType: 'photo',
  sourcePhotoUris: ['file:///saved.jpg'],
  title: 'Saved Without Link',
  status: 'saved',
  createdAt: '2026-04-05T10:04:00.000Z',
  updatedAt: '2026-04-05T10:04:00.000Z',
};

describe('ImportHistorySection', () => {
  it('renders failed, in-review, and saved rows with their available actions', () => {
    const onRetryImport = jest.fn();
    const onResumeReview = jest.fn();
    const onOpenRecipe = jest.fn();

    render(
      <ImportHistorySection
        history={{
          failed: [failedRetryableJob, failedNonRetryableJob],
          inReview: [inReviewJob],
          saved: [savedJob, savedWithoutRecipeJob],
        }}
        onRetryImport={onRetryImport}
        onResumeReview={onResumeReview}
        onOpenRecipe={onOpenRecipe}
      />
    );

    expect(screen.getByText('Recent imports')).toBeTruthy();
    expect(screen.getByText('Resume drafts, retry failed imports, or reopen recipes you just saved.')).toBeTruthy();
    expect(screen.getByText('Needs attention')).toBeTruthy();
    expect(screen.getByText('In review')).toBeTruthy();
    expect(screen.getByText('Recently saved')).toBeTruthy();
    expect(screen.getAllByText('Link import').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Photo import').length).toBeGreaterThan(0);
    expect(screen.getByText('Broken Soup')).toBeTruthy();
    expect(screen.getByText('example.com/broken-soup')).toBeTruthy();
    expect(screen.getByText('The page did not include recipe instructions.')).toBeTruthy();
    expect(screen.getByText('Cannot retry')).toBeTruthy();

    fireEvent.press(screen.getByText('Try again'));
    expect(onRetryImport).toHaveBeenCalledWith(failedRetryableJob);

    fireEvent.press(screen.getByText('Resume review'));
    expect(onResumeReview).toHaveBeenCalledWith(inReviewJob);

    fireEvent.press(screen.getByText('Open recipe'));
    expect(onOpenRecipe).toHaveBeenCalledWith(savedJob);
    expect(screen.queryByTestId('import-history-open-job-saved-missing-recipe')).toBeNull();
  });

  it('renders an empty state when there are no import jobs', () => {
    render(
      <ImportHistorySection
        history={{ failed: [], inReview: [], saved: [] }}
        onRetryImport={jest.fn()}
        onResumeReview={jest.fn()}
        onOpenRecipe={jest.fn()}
      />
    );

    expect(screen.getByText('Recent imports')).toBeTruthy();
    expect(screen.getByText('Imports you start from links, photos, or shared recipes will appear here.')).toBeTruthy();
    expect(screen.queryByText('Needs attention')).toBeNull();
    expect(screen.queryByText('In review')).toBeNull();
    expect(screen.queryByText('Recently saved')).toBeNull();
  });
});
