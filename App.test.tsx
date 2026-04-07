import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, AppState, type AppStateStatus } from 'react-native';

import type { RecipeBookState } from './src/store/recipe-book';

const mockCloudState: RecipeBookState = {
  groups: [
    { id: 'group-weeknight', name: 'Weeknight', isFavorite: false },
    { id: 'group-weekend', name: 'Weekend', isFavorite: false },
    { id: 'group-healthy', name: 'Healthy', isFavorite: false },
  ],
  recipes: [
    {
      id: 'recipe-1',
      title: 'Jalapeño Popper Turkey Burgers',
      description: undefined,
      heroImageUri: undefined,
      sourceUrl: 'https://example.com/jalapeno-popper-turkey-burgers',
      sourceType: 'url' as const,
      sourcePhotoUris: [],
      ingredients: ['1 protein or main ingredient'],
      instructions: ['Review the imported recipe and update the title, ingredients, and servings as needed.'],
      servings: '6',
      status: 'ready' as const,
      createdAt: '2026-04-04T12:00:00.000Z',
      updatedAt: '2026-04-04T12:00:00.000Z',
    },
  ],
  memberships: [
    { recipeId: 'recipe-1', groupId: 'group-weeknight' },
    { recipeId: 'recipe-1', groupId: 'group-healthy' },
  ],
  importJobs: [],
};

const importedCloudState: RecipeBookState = {
  ...mockCloudState,
  recipes: [
    ...mockCloudState.recipes,
    {
      id: 'recipe-2',
      title: 'Cacio E Pepe',
      description: undefined,
      heroImageUri: undefined,
      sourceUrl: 'https://example.com/cacio-e-pepe',
      sourceType: 'url' as const,
      sourcePhotoUris: [],
      ingredients: ['12 ounces spaghetti', '2 cups pecorino romano'],
      instructions: ['Cook the pasta.', 'Toss with cheese and pepper.'],
      servings: undefined,
      status: 'ready' as const,
      createdAt: '2026-04-04T12:05:00.000Z',
      updatedAt: '2026-04-04T12:05:00.000Z',
    },
  ],
  memberships: [...mockCloudState.memberships, { recipeId: 'recipe-2', groupId: 'group-weeknight' }],
};

const mockRepository = {
  loadState: jest.fn(async () => mockCloudState),
  createGroup: jest.fn(async () => mockCloudState),
  renameGroup: jest.fn(async () => mockCloudState),
  setGroupFavorite: jest.fn(async (_groupId: string, isFavorite: boolean) => ({
    ...mockCloudState,
    groups: mockCloudState.groups.map((group) =>
      group.id === 'group-weeknight' ? { ...group, isFavorite } : group
    ),
  })),
  deleteGroup: jest.fn(async () => mockCloudState),
  importRecipe: jest.fn(async () => importedCloudState),
  upsertImportJob: jest.fn(async (job) => ({
    ...(job.status === 'saved' ? importedCloudState : mockCloudState),
    importJobs: [job],
  })),
  updateRecipe: jest.fn(async () => mockCloudState),
  deleteRecipe: jest.fn(async () => ({
    ...mockCloudState,
    recipes: [],
    memberships: [],
  })),
};

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(async () => ({
    canceled: false,
    assets: [
      {
        uri: 'file:///camera-shot.jpg',
        mimeType: 'image/jpeg',
        base64: 'ZmFrZS1jYW1lcmE=',
      },
    ],
  })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [
      {
        uri: 'file:///cookbook-page.jpg',
        mimeType: 'image/jpeg',
        base64: 'ZmFrZS1saWJyYXJ5',
      },
    ],
  })),
}));

jest.mock('./src/lib/supabase', () => ({
  supabase: {},
}));

jest.mock('./src/lib/recipe-book-repository', () => ({
  createSupabaseRecipeBookPersistence: jest.fn(() => ({})),
  createRecipeBookRepository: jest.fn(() => mockRepository),
}));

jest.mock('./src/services/url-import', () => ({
  importRecipeFromUrl: jest.fn(async (sourceUrl: string) => {
    if (sourceUrl.includes('not-a-recipe')) {
      throw new Error('This link does not appear to contain a recipe.');
    }

    return {
      title: 'Cacio E Pepe',
      sourceType: 'url',
      sourceUrl,
      sourcePhotoUris: [],
      ingredients: ['12 ounces spaghetti', '2 cups pecorino romano'],
      instructions: ['Cook the pasta.', 'Toss with cheese and pepper.'],
      status: 'needs_review',
    };
  }),
}));

jest.mock('./src/services/photo-import', () => ({
  importRecipeFromPhoto: jest.fn(async () => ({
    title: 'Pesto Chicken and Roasted Veggie Farro Bowls',
    sourceType: 'photo',
    sourcePhotoUris: ['file:///cookbook-page.jpg'],
    heroImageUri: 'file:///cookbook-page.jpg',
    ingredients: ['1 pound chicken cutlets, sliced in half', '4 cups broccoli florets'],
    instructions: ['Marinate the chicken.', 'Roast the vegetables and serve with farro.'],
    servings: '4',
    prepTime: '20 mins',
    cookTime: '35 mins',
    status: 'needs_review',
  })),
}));

import App from './App';

async function pressPrimaryTab(label: 'Recipes' | 'Groups' | 'Add') {
  const initialLoadCount = mockRepository.loadState.mock.calls.length;

  await act(async () => {
    fireEvent.press(screen.getAllByText(label)[0]);
    await Promise.resolve();
  });

  await waitFor(() => {
    expect(mockRepository.loadState.mock.calls.length).toBeGreaterThan(initialLoadCount);
  });
}

async function signInToLibrary() {
  fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
  fireEvent.press(screen.getByText('Continue to library'));
  expect(await screen.findByText('Shared library in sync')).toBeTruthy();
}

describe('Recipe Organizer app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository.loadState.mockResolvedValue(mockCloudState);
    mockRepository.createGroup.mockResolvedValue(mockCloudState);
    mockRepository.renameGroup.mockResolvedValue(mockCloudState);
    mockRepository.setGroupFavorite.mockResolvedValue({
      ...mockCloudState,
      groups: mockCloudState.groups.map((group) =>
        group.id === 'group-weeknight' ? { ...group, isFavorite: true } : group
      ),
    });
    mockRepository.deleteGroup.mockResolvedValue(mockCloudState);
    mockRepository.importRecipe.mockResolvedValue(importedCloudState);
    mockRepository.upsertImportJob.mockImplementation(async (job) => ({
      ...(job.status === 'saved' ? importedCloudState : mockCloudState),
      importJobs: [job],
    }));
    mockRepository.updateRecipe.mockResolvedValue(mockCloudState);
    mockRepository.deleteRecipe.mockResolvedValue({
      ...mockCloudState,
      recipes: [],
      memberships: [],
    });
  });

  it('shows the household sign-in gate before the library', () => {
    render(<App />);

    expect(screen.getByText('Your household recipe library')).toBeTruthy();
    expect(screen.getByText('Enter the shared kitchen account to browse, import, and organize recipes together.')).toBeTruthy();
  });

  it('enters the library and creates a review draft from a pasted URL', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();

    expect(screen.getAllByText('Recipes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Groups').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Add').length).toBeGreaterThan(0);

    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/cacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByDisplayValue('Cacio E Pepe')).toBeTruthy();
    expect(screen.getByText('Review import')).toBeTruthy();
    expect(screen.getByText('Confirm recipe')).toBeTruthy();
  });

  it('lets the user leave the review screen and paste a different link', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();

    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/cacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByText('Review import')).toBeTruthy();

    fireEvent.press(screen.getByText('Back to import'));

    expect(screen.getByText('From link')).toBeTruthy();
    expect(screen.getByDisplayValue('https://example.com/cacio-e-pepe')).toBeTruthy();
  });

  it('creates a review draft from a cookbook photo using the same review layout', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();

    await pressPrimaryTab('Add');
    fireEvent.press(screen.getByText('Photo library'));

    expect(await screen.findByDisplayValue('Pesto Chicken and Roasted Veggie Farro Bowls')).toBeTruthy();
    expect(screen.getByDisplayValue('4')).toBeTruthy();
    expect(screen.getByDisplayValue('20 mins')).toBeTruthy();
    expect(screen.getByDisplayValue('35 mins')).toBeTruthy();
    expect(screen.getByText('Review import')).toBeTruthy();
    expect(screen.getByText('Confirm recipe')).toBeTruthy();
  });

  it('completes the visible save flow even if marking the import job saved fails afterward', async () => {
    mockRepository.upsertImportJob.mockImplementation(async (job) => {
      if (job.status === 'saved') {
        throw new Error('We could not update that import draft right now.');
      }

      return {
        ...mockCloudState,
        importJobs: [job],
      };
    });

    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();

    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/cacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));
    expect(await screen.findByText('Review import')).toBeTruthy();

    fireEvent.press(screen.getByText('Weeknight'));
    fireEvent.press(screen.getByText('Confirm recipe'));

    expect(await screen.findByPlaceholderText('Rename group')).toBeTruthy();
    expect(await screen.findByText('Cacio E Pepe')).toBeTruthy();
    expect(screen.queryByText('Review import')).toBeNull();
  });

  it('resets photo importing and shows a recoverable error when the picker launch throws', async () => {
    const imagePicker = jest.requireMock('expo-image-picker') as {
      launchImageLibraryAsync: jest.Mock;
    };
    imagePicker.launchImageLibraryAsync.mockRejectedValueOnce(new Error('Photo library is unavailable right now.'));

    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();

    await pressPrimaryTab('Add');
    fireEvent.press(screen.getByText('Photo library'));

    expect(await screen.findByText('Cookbook photo import needs attention')).toBeTruthy();
    expect(screen.getByText('Photo library is unavailable right now.')).toBeTruthy();
    expect(screen.getAllByText('Photo library').length).toBeGreaterThan(0);
    expect(screen.queryByText('Importing photo…')).toBeNull();
  });

  it('shows retry-oriented import feedback for a non-recipe link instead of a review draft', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();

    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/not-a-recipe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByText('Recipe link import needs attention')).toBeTruthy();
    expect(screen.getAllByText('This link does not appear to contain a recipe.').length).toBeGreaterThan(0);
    expect(screen.getByText('Try another link')).toBeTruthy();
    expect(screen.queryByText('Review import')).toBeNull();
  });

  it('creates a needs-attention import history item when a URL import fails', async () => {
    mockRepository.upsertImportJob.mockImplementation(async (job) => ({
      ...mockCloudState,
      importJobs: [job],
    }));

    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();

    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/not-a-recipe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByText('Needs attention')).toBeTruthy();
    expect(screen.getByText('Not A Recipe')).toBeTruthy();
    expect(screen.getAllByText('This link does not appear to contain a recipe.').length).toBeGreaterThan(0);
    expect(mockRepository.upsertImportJob).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'url',
        sourceUrl: 'https://example.com/not-a-recipe',
        title: 'Not A Recipe',
        status: 'failed',
        errorMessage: 'This link does not appear to contain a recipe.',
      })
    );
  });

  it('leaves an in-review import history item behind when backing out of a parsed draft', async () => {
    mockRepository.upsertImportJob.mockImplementation(async (job) => ({
      ...mockCloudState,
      importJobs: [job],
    }));

    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();

    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/cacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByText('Review import')).toBeTruthy();

    fireEvent.press(screen.getByText('Back to import'));

    expect(await screen.findByText('In review')).toBeTruthy();
    expect(screen.getByText('Resume review')).toBeTruthy();
    expect(mockRepository.upsertImportJob).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'url',
        sourceUrl: 'https://example.com/cacio-e-pepe',
        title: 'Cacio E Pepe',
        status: 'in_review',
        draft: expect.objectContaining({
          title: 'Cacio E Pepe',
        }),
      })
    );
  });

  it('retries a failed URL import from history and moves it into review when parsing later succeeds', async () => {
    const importRecipeFromUrlMock = jest.requireMock('./src/services/url-import').importRecipeFromUrl as jest.Mock;
    const failedJobState = {
      ...mockCloudState,
      importJobs: [
        {
          id: 'job-failed-url-1',
          sourceType: 'url' as const,
          sourceUrl: 'https://example.com/not-a-recipe',
          sourcePhotoUris: [],
          title: 'Not A Recipe',
          status: 'failed' as const,
          errorMessage: 'This link does not appear to contain a recipe.',
          createdAt: '2026-04-04T12:10:00.000Z',
          updatedAt: '2026-04-04T12:10:00.000Z',
        },
      ],
    };

    mockRepository.loadState.mockResolvedValue(failedJobState);
    mockRepository.upsertImportJob.mockImplementation(async (job) => ({
      ...failedJobState,
      importJobs: [job],
    }));
    importRecipeFromUrlMock.mockResolvedValueOnce({
      title: 'Recovered Pasta',
      sourceType: 'url',
      sourceUrl: 'https://example.com/not-a-recipe',
      sourcePhotoUris: [],
      ingredients: ['1 pound pasta'],
      instructions: ['Boil the pasta.'],
      status: 'needs_review',
    });

    render(<App />);

    await signInToLibrary();
    await pressPrimaryTab('Add');

    expect(await screen.findByText('Needs attention')).toBeTruthy();
    fireEvent.press(screen.getByText('Retry'));

    expect(await screen.findByText('Review import')).toBeTruthy();
    expect(screen.getByDisplayValue('Recovered Pasta')).toBeTruthy();
    expect(mockRepository.upsertImportJob).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'job-failed-url-1',
        sourceType: 'url',
        sourceUrl: 'https://example.com/not-a-recipe',
        title: 'Recovered Pasta',
        status: 'in_review',
        draft: expect.objectContaining({
          title: 'Recovered Pasta',
        }),
      })
    );
  });

  it('retries a failed URL import from history and keeps the same job id when the retry fails again', async () => {
    const importRecipeFromUrlMock = jest.requireMock('./src/services/url-import').importRecipeFromUrl as jest.Mock;
    const failedJobState = {
      ...mockCloudState,
      importJobs: [
        {
          id: 'job-failed-url-2',
          sourceType: 'url' as const,
          sourceUrl: 'https://example.com/still-not-a-recipe',
          sourcePhotoUris: [],
          title: 'Still Not A Recipe',
          status: 'failed' as const,
          errorMessage: 'This link does not appear to contain a recipe.',
          createdAt: '2026-04-04T12:11:00.000Z',
          updatedAt: '2026-04-04T12:11:00.000Z',
        },
      ],
    };

    mockRepository.loadState.mockResolvedValue(failedJobState);
    mockRepository.upsertImportJob.mockImplementation(async (job) => ({
      ...failedJobState,
      importJobs: [job],
    }));
    importRecipeFromUrlMock.mockRejectedValueOnce(new Error('Still not a recipe page.'));

    render(<App />);

    await signInToLibrary();
    await pressPrimaryTab('Add');

    expect(await screen.findByText('Needs attention')).toBeTruthy();
    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getAllByText('Still not a recipe page.').length).toBeGreaterThan(0);
      expect(mockRepository.upsertImportJob).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'job-failed-url-2',
          sourceType: 'url',
          sourceUrl: 'https://example.com/still-not-a-recipe',
          status: 'failed',
          errorMessage: 'Still not a recipe page.',
        })
      );
    });
  });

  it('resumes an in-review draft from history and reopens the review form with the same job id', async () => {
    const inReviewState = {
      ...mockCloudState,
      importJobs: [
        {
          id: 'job-review-1',
          sourceType: 'url' as const,
          sourceUrl: 'https://example.com/resumable-soup',
          sourcePhotoUris: [],
          title: 'Resumable Soup',
          status: 'in_review' as const,
          draft: {
            title: 'Resumable Soup',
            description: 'Pick up where you left off.',
            sourceType: 'url' as const,
            sourceUrl: 'https://example.com/resumable-soup',
            sourcePhotoUris: [],
            ingredients: ['2 cups broth'],
            instructions: ['Warm and serve.'],
            servings: '2',
            status: 'needs_review' as const,
          },
          createdAt: '2026-04-04T12:15:00.000Z',
          updatedAt: '2026-04-04T12:15:00.000Z',
        },
      ],
    };

    mockRepository.loadState.mockResolvedValue(inReviewState);
    mockRepository.upsertImportJob.mockImplementation(async (job) => ({
      ...importedCloudState,
      importJobs: [job],
    }));

    render(<App />);

    await signInToLibrary();
    await pressPrimaryTab('Add');

    expect(await screen.findByText('In review')).toBeTruthy();
    fireEvent.press(screen.getByText('Resume review'));

    expect(await screen.findByText('Review import')).toBeTruthy();
    expect(screen.getByDisplayValue('Resumable Soup')).toBeTruthy();
    expect(screen.getByDisplayValue('Pick up where you left off.')).toBeTruthy();
    expect(screen.getByDisplayValue('2')).toBeTruthy();

    fireEvent.press(screen.getByText('Weeknight'));
    fireEvent.press(screen.getByText('Confirm recipe'));

    await waitFor(() => {
      expect(mockRepository.upsertImportJob).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'job-review-1',
          status: 'saved',
        })
      );
    });
  });

  it('opens a saved import from history into the associated recipe detail', async () => {
    const savedState = {
      ...importedCloudState,
      importJobs: [
        {
          id: 'job-saved-1',
          sourceType: 'url' as const,
          sourceUrl: 'https://example.com/cacio-e-pepe',
          sourcePhotoUris: [],
          title: 'Cacio E Pepe',
          status: 'saved' as const,
          recipeId: 'recipe-2',
          createdAt: '2026-04-04T12:20:00.000Z',
          updatedAt: '2026-04-04T12:20:00.000Z',
        },
      ],
    };

    mockRepository.loadState.mockResolvedValue(savedState);

    render(<App />);

    await signInToLibrary();
    await pressPrimaryTab('Add');

    expect(await screen.findByText('Recently saved')).toBeTruthy();
    fireEvent.press(screen.getByText('Open recipe'));

    expect(await screen.findByTestId('recipe-detail-screen')).toBeTruthy();
    expect(screen.getAllByText('Cacio E Pepe').length).toBeGreaterThan(1);
    expect(screen.getByText('Open original recipe')).toBeTruthy();
  });

  it('shows shared-library sync status on the Recipes tab when cloud sync is enabled', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));

    expect(await screen.findByText('Shared library in sync')).toBeTruthy();
  });

  it('lets the user favorite a group and surfaces it in the favorite groups section', async () => {
    const favoritedState = {
      ...mockCloudState,
      groups: mockCloudState.groups.map((group) =>
        group.id === 'group-weeknight' ? { ...group, isFavorite: true } : group
      ),
    };
    mockRepository.setGroupFavorite.mockResolvedValue(favoritedState);

    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));

    expect(await screen.findByText('No favorite groups yet')).toBeTruthy();

    await pressPrimaryTab('Groups');
    fireEvent.press(screen.getByTestId('groups-favorite-button-group-weeknight'));

    await waitFor(() => {
      expect(mockRepository.setGroupFavorite).toHaveBeenCalledWith('group-weeknight', true);
    });

    mockRepository.loadState.mockResolvedValue(favoritedState);
    await pressPrimaryTab('Recipes');
    expect(await screen.findByText('Weeknight')).toBeTruthy();
  });

  it('exposes refreshable scroll containers on Recipes, Groups, and Add landing view', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));

    expect(await screen.findByTestId('recipes-scroll-view')).toBeTruthy();

    await pressPrimaryTab('Groups');
    expect(screen.getByTestId('groups-scroll-view')).toBeTruthy();

    await pressPrimaryTab('Add');
    expect(screen.getByTestId('add-scroll-view')).toBeTruthy();
  });

  it('refreshes cloud state when returning to top-level tabs', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));

    expect(await screen.findByText('Shared library in sync')).toBeTruthy();
    mockRepository.loadState.mockClear();

    await pressPrimaryTab('Groups');
    await waitFor(() => expect(mockRepository.loadState).toHaveBeenCalledTimes(1));

    await pressPrimaryTab('Add');
    await waitFor(() => expect(mockRepository.loadState).toHaveBeenCalledTimes(2));

    await pressPrimaryTab('Recipes');
    await waitFor(() => expect(mockRepository.loadState).toHaveBeenCalledTimes(3));
  });

  it('refreshes cloud state when the app returns to the foreground', async () => {
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    const addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((type, listener) => {
        if (type === 'change') {
          appStateListener = listener;
        }

        return { remove: jest.fn() };
      });

    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));

    expect(await screen.findByText('Shared library in sync')).toBeTruthy();
    mockRepository.loadState.mockClear();

    expect(appStateListener).toBeDefined();

    await act(async () => {
      appStateListener?.('background');
      appStateListener?.('active');
    });

    await waitFor(() => expect(mockRepository.loadState).toHaveBeenCalledTimes(1));

    addEventListenerSpy.mockRestore();
  });

  it('keeps the Add review draft free of the landing refresh status copy', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();

    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/cacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByText('Review import')).toBeTruthy();
    expect(screen.queryByText(/Last synced|Refreshing your shared library/i)).toBeNull();
  });

  it('keeps the add review flow inside a scroll view so lower controls remain reachable', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();
    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/cacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByTestId('add-scroll-view')).toBeTruthy();
  });

  it('confirms a recipe into the chosen group and shows it there immediately', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();
    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/cacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByText('Review import')).toBeTruthy();

    fireEvent.press(screen.getByText('Weeknight'));
    fireEvent.press(screen.getByText('Confirm recipe'));

    expect(await screen.findByPlaceholderText('Rename group')).toBeTruthy();
    expect(await screen.findByText('Cacio E Pepe')).toBeTruthy();
  });

  it('deletes a recipe from the recipe detail view', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();

    fireEvent.press(screen.getByText('Jalapeño Popper Turkey Burgers'));
    expect(await screen.findByText('Open original recipe')).toBeTruthy();

    fireEvent.press(screen.getByTestId('recipe-detail-delete-button'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete recipe?',
      expect.stringContaining('Jalapeño Popper Turkey Burgers'),
      expect.any(Array)
    );

    const deleteAction = (alertSpy.mock.calls[0]?.[2] as { text: string; onPress?: () => void }[]).find(
      (action) => action.text === 'Delete'
    );

    await act(async () => {
      deleteAction?.onPress?.();
    });

    await waitFor(() => {
      expect(screen.queryAllByText('Jalapeño Popper Turkey Burgers')).toHaveLength(0);
    });

    alertSpy.mockRestore();
  });
});
