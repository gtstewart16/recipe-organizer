import { RefreshControl } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { RecipeGroup } from '../../store/recipe-book';
import { AddRecipeScreen, type EditableReviewDraft } from './AddRecipeScreen';

const groups: RecipeGroup[] = [
  { id: 'group-weeknight', name: 'Weeknight', isFavorite: true },
  { id: 'group-weekend', name: 'Weekend', isFavorite: false },
];

const reviewDraft: EditableReviewDraft = {
  title: 'Cacio E Pepe',
  description: undefined,
  sourceType: 'url',
  sourceUrl: 'https://example.com/cacio-e-pepe',
  sourcePhotoUris: [],
  ingredients: ['12 ounces spaghetti', '2 cups pecorino romano'],
  instructions: ['Cook the pasta.', 'Toss with cheese and pepper.'],
  servings: '4',
  prepTime: '10 mins',
  cookTime: '15 mins',
  status: 'needs_review',
  selectedGroupIds: ['group-weeknight'],
};

const importHistory: NonNullable<React.ComponentProps<typeof AddRecipeScreen>['importHistory']> = {
  history: {
    failed: [],
    inReview: [
      {
        id: 'job-review',
        sourceType: 'url',
        sourceUrl: 'https://example.com/cacio-e-pepe',
        sourcePhotoUris: [],
        title: 'Cacio E Pepe',
        status: 'in_review',
        createdAt: '2026-04-05T10:00:00.000Z',
        updatedAt: '2026-04-05T10:00:00.000Z',
      },
    ],
    saved: [],
  },
  onRetryImport: jest.fn(),
  onResumeReview: jest.fn(),
  onOpenRecipe: jest.fn(),
};

function renderAddRecipeScreen(overrides: Partial<React.ComponentProps<typeof AddRecipeScreen>> = {}) {
  const props: React.ComponentProps<typeof AddRecipeScreen> = {
    groups,
    reviewDraft: null,
    urlInput: '',
    importError: null,
    lastImportSourceType: null,
    isImportingUrl: false,
    isImportingPhoto: false,
    onUrlInputChange: jest.fn(),
    onBeginUrlReview: jest.fn(),
    onBeginPhotoReview: jest.fn(),
    onRetryImport: jest.fn(),
    onDismissImportError: jest.fn(),
    onReviewDraftChange: jest.fn(),
    onBackToImport: jest.fn(),
    onDiscardDraft: jest.fn(),
    onSaveRecipe: jest.fn(),
    ...overrides,
  };

  render(<AddRecipeScreen {...props} />);

  return props;
}

describe('AddRecipeScreen', () => {
  it('renders landing import panels and wires URL import actions', () => {
    const props = renderAddRecipeScreen({
      refreshControl: <RefreshControl refreshing={false} onRefresh={jest.fn()} />,
    });

    expect(screen.getByTestId('add-scroll-view').props.refreshControl).toBeTruthy();
    expect(screen.getByText('From link')).toBeTruthy();
    expect(screen.getByText('From photo')).toBeTruthy();
    expect(screen.getByText('Use camera')).toBeTruthy();
    expect(screen.getByText('Photo library')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('https://example.com/cacio-e-pepe'), 'https://example.com/cacio-e-pepe');
    expect(props.onUrlInputChange).toHaveBeenCalledWith('https://example.com/cacio-e-pepe');

    fireEvent.press(screen.getByText('Create review draft'));
    expect(props.onBeginUrlReview).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Use camera'));
    expect(props.onBeginPhotoReview).toHaveBeenCalledWith('camera');

    fireEvent.press(screen.getByText('Photo library'));
    expect(props.onBeginPhotoReview).toHaveBeenCalledWith('library');
  });

  it('renders import history below the landing import panels', () => {
    renderAddRecipeScreen({
      importHistory,
    });

    const linkPanel = screen.getByText('From link');
    const photoPanel = screen.getByText('From photo');
    const history = screen.getByText('Recent imports');

    expect(linkPanel).toBeTruthy();
    expect(photoPanel).toBeTruthy();
    expect(history).toBeTruthy();
  });

  it('renders shared imports above import history on the landing view', () => {
    renderAddRecipeScreen({
      sharedImportQueue: {
        items: [
          {
            id: 'share-ready',
            status: 'ready',
            sourceKind: 'url',
            sourceLabel: 'example.com',
            payload: { url: 'https://example.com/cacio-e-pepe' },
            draft: reviewDraft,
            createdAt: '2026-04-05T10:00:00.000Z',
            updatedAt: '2026-04-05T10:00:00.000Z',
          },
        ],
        onOpen: jest.fn(),
        onRetry: jest.fn(),
        onDismiss: jest.fn(),
      },
      importHistory,
    });

    expect(screen.getByText('Import inbox')).toBeTruthy();
    expect(screen.getByText('Recent imports')).toBeTruthy();
  });

  it('hides import history while reviewing a draft', () => {
    renderAddRecipeScreen({
      reviewDraft,
      importHistory,
    });

    expect(screen.getByText('Review import')).toBeTruthy();
    expect(screen.queryByText('Recent imports')).toBeNull();
  });

  it('renders URL import feedback actions', () => {
    const props = renderAddRecipeScreen({
      importError: 'The recipe link could not be read.',
      lastImportSourceType: 'url',
    });

    expect(screen.getByText('Recipe link import needs attention')).toBeTruthy();
    expect(screen.getByText('The recipe link could not be read.')).toBeTruthy();

    fireEvent.press(screen.getByText('Try another link'));
    expect(props.onRetryImport).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Dismiss'));
    expect(props.onDismissImportError).toHaveBeenCalledTimes(1);
  });

  it('renders photo import feedback actions', () => {
    const props = renderAddRecipeScreen({
      importError: 'The cookbook photo could not be read.',
      lastImportSourceType: 'photo',
    });

    expect(screen.getByText('Cookbook photo import needs attention')).toBeTruthy();
    expect(screen.getByText('The cookbook photo could not be read.')).toBeTruthy();

    fireEvent.press(screen.getByText('Try another photo'));
    expect(props.onRetryImport).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Dismiss'));
    expect(props.onDismissImportError).toHaveBeenCalledTimes(1);
  });

  it('renders review draft mode and updates group selection', () => {
    const props = renderAddRecipeScreen({ reviewDraft });

    expect(screen.getByText('Review import')).toBeTruthy();
    expect(screen.getByDisplayValue('Cacio E Pepe')).toBeTruthy();
    expect(screen.getByText('Confirm recipe')).toBeTruthy();

    fireEvent.press(screen.getByText('Weekend'));
    expect(props.onReviewDraftChange).toHaveBeenCalledWith({
      ...reviewDraft,
      selectedGroupIds: ['group-weeknight', 'group-weekend'],
    });

    fireEvent.press(screen.getByText('Confirm recipe'));
    expect(props.onSaveRecipe).toHaveBeenCalledTimes(1);
  });
});
