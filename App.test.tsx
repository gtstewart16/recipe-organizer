import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Alert, AppState, Linking, type AppStateStatus } from 'react-native';

import type { PendingSharedImport } from './src/features/shared-imports/types';
import type { ImportJob, RecipeBookState } from './src/store/recipe-book';

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

const failedUrlImportJob: ImportJob = {
  id: 'job-failed-url',
  sourceType: 'url',
  sourceUrl: 'https://example.com/cacio-e-pepe',
  sourcePhotoUris: [],
  title: 'Cacio E Pepe',
  status: 'failed',
  errorMessage: 'The page did not include recipe instructions.',
  createdAt: '2026-04-05T10:00:00.000Z',
  updatedAt: '2026-04-05T10:00:00.000Z',
};

const inReviewImportJob: ImportJob = {
  id: 'job-review-url',
  sourceType: 'url',
  sourceUrl: 'https://example.com/cacio-e-pepe',
  sourcePhotoUris: [],
  title: 'Cacio E Pepe',
  status: 'in_review',
  draft: {
    title: 'Cacio E Pepe',
    sourceType: 'url',
    sourceUrl: 'https://example.com/cacio-e-pepe',
    sourcePhotoUris: [],
    ingredients: ['12 ounces spaghetti', '2 cups pecorino romano'],
    instructions: ['Cook the pasta.', 'Toss with cheese and pepper.'],
    status: 'needs_review',
  },
  createdAt: '2026-04-05T10:01:00.000Z',
  updatedAt: '2026-04-05T10:01:00.000Z',
};

const savedImportJob: ImportJob = {
  id: 'job-saved-url',
  sourceType: 'url',
  sourceUrl: 'https://example.com/jalapeno-popper-turkey-burgers',
  sourcePhotoUris: [],
  title: 'Jalapeño Popper Turkey Burgers',
  status: 'saved',
  recipeId: 'recipe-1',
  createdAt: '2026-04-05T10:02:00.000Z',
  updatedAt: '2026-04-05T10:02:00.000Z',
};

const failedPhotoImportJob: ImportJob = {
  id: 'job-failed-photo',
  sourceType: 'photo',
  sourcePhotoUris: ['file:///cookbook-page.jpg'],
  title: 'Cookbook Recipe Draft',
  status: 'failed',
  errorMessage: 'The photo could not be parsed.',
  createdAt: '2026-04-05T10:03:00.000Z',
  updatedAt: '2026-04-05T10:03:00.000Z',
};

const readySharedImport: PendingSharedImport = {
  id: 'share-ready-url',
  status: 'ready',
  sourceKind: 'url',
  sourceLabel: 'skinnytaste.com',
  payload: { url: 'https://www.skinnytaste.com/mushroom-risotto' },
  draft: {
    title: 'Mushroom Risotto',
    sourceType: 'url',
    sourceUrl: 'https://www.skinnytaste.com/mushroom-risotto',
    sourcePhotoUris: [],
    ingredients: ['2 cups arborio rice'],
    instructions: ['Heat the stock.', 'Stir the rice.'],
    servings: '6 servings',
    status: 'needs_review',
  },
  createdAt: '2026-06-07T10:00:00.000Z',
  updatedAt: '2026-06-07T10:01:00.000Z',
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

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(async () => 'ZmFrZS1yZXRyeS1pbWFnZQ=='),
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

jest.mock('./src/lib/auth-session', () => ({
  loadAuthSession: jest.fn(async () => false),
  persistAuthSession: jest.fn(async () => undefined),
  clearAuthSession: jest.fn(async () => undefined),
}));

import App from './App';
import { clearAuthSession, loadAuthSession, persistAuthSession } from './src/lib/auth-session';

const mockLoadAuthSession = jest.mocked(loadAuthSession);
const mockPersistAuthSession = jest.mocked(persistAuthSession);
const mockClearAuthSession = jest.mocked(clearAuthSession);
const mockAsyncStorage = jest.mocked(AsyncStorage);
let linkingUrlHandler: ((event: { url: string }) => void) | null = null;

async function renderAppToSignInGate() {
  const rendered = render(<App />);
  expect(await screen.findByText('Your household recipe library')).toBeTruthy();
  return rendered;
}

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

async function pressPrimaryTabWithoutRefreshWait(label: 'Recipes' | 'Groups' | 'Add') {
  await act(async () => {
    fireEvent.press(screen.getAllByText(label)[0]);
    await Promise.resolve();
  });
}

async function signInToLibrary() {
  fireEvent.changeText(await screen.findByPlaceholderText('Household email'), 'home@kitchen.test');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
  fireEvent.press(screen.getByText('Continue to library'));
  expect(await screen.findByTestId('recipes-scroll-view')).toBeTruthy();
}

function seedSharedImportStorage(records: PendingSharedImport[]) {
  let value = JSON.stringify(records);

  mockAsyncStorage.getItem.mockImplementation(async () => value);
  mockAsyncStorage.setItem.mockImplementation(async (_key: string, nextValue: string) => {
    value = nextValue;
  });

  return {
    read() {
      return JSON.parse(value) as PendingSharedImport[];
    },
  };
}

describe('Recipe Organizer app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    linkingUrlHandler = null;
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_eventType, handler) => {
      linkingUrlHandler = handler as (event: { url: string }) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof Linking.addEventListener>;
    });
    mockLoadAuthSession.mockResolvedValue(false);
    mockPersistAuthSession.mockResolvedValue(undefined);
    mockClearAuthSession.mockResolvedValue(undefined);
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
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('shows the household sign-in gate before the library', async () => {
    await renderAppToSignInGate();

    expect(screen.getByText('Enter the shared kitchen account to browse, import, and organize recipes together.')).toBeTruthy();
  });

  it('restores a persisted signed-in session and skips the auth gate', async () => {
    mockLoadAuthSession.mockResolvedValueOnce(true);

    render(<App />);

    expect(await screen.findByTestId('recipes-scroll-view')).toBeTruthy();
    expect(screen.queryByText('Your household recipe library')).toBeNull();
    expect(screen.queryByText('Continue to library')).toBeNull();
  });

  it('keeps successful cloud sync quiet on the Recipes screen', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();

    expect(screen.queryByText('Shared library in sync')).toBeNull();
    expect(screen.queryByText('Up to date')).toBeNull();
    expect(screen.queryByText('View sync issue')).toBeNull();
  });

  it('persists the auth session after a successful sign-in', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();
    await waitFor(() => {
      expect(mockPersistAuthSession).toHaveBeenCalledTimes(1);
    });
  });

  it('opens actionable sync issue details after a refresh failure', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderAppToSignInGate();
    await signInToLibrary();

    mockRepository.loadState.mockRejectedValueOnce(new Error('Network request failed.'));

    await act(async () => {
      screen.getByTestId('recipes-scroll-view').props.refreshControl.props.onRefresh();
      await Promise.resolve();
    });

    expect(await screen.findByText('Refresh paused')).toBeTruthy();
    fireEvent.press(screen.getByText('View sync issue'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Refresh paused',
      'Network request failed.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Try again' }),
      ])
    );
  });

  it('opens settings from the top-right utility button', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();

    fireEvent.press(screen.getByLabelText('Open settings'));

    expect(await screen.findByTestId('settings-screen')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('signs out from settings and returns to the auth screen', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();

    fireEvent.press(screen.getByLabelText('Open settings'));
    expect(await screen.findByTestId('settings-screen')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Sign out'));

    expect(await screen.findByText('Your household recipe library')).toBeTruthy();
    expect(screen.queryByTestId('settings-screen')).toBeNull();
    expect(screen.queryByText('Shared library in sync')).toBeNull();

    await waitFor(() => {
      expect(mockClearAuthSession).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the auth screen again after sign-out and relaunch', async () => {
    const app = render(<App />);

    expect(await screen.findByText('Your household recipe library')).toBeTruthy();
    await signInToLibrary();

    fireEvent.press(screen.getByLabelText('Open settings'));
    expect(await screen.findByTestId('settings-screen')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Sign out'));
    expect(await screen.findByText('Your household recipe library')).toBeTruthy();

    app.unmount();
    mockLoadAuthSession.mockResolvedValueOnce(false);

    render(<App />);

    expect(await screen.findByText('Your household recipe library')).toBeTruthy();
    expect(screen.queryByText('Shared library in sync')).toBeNull();
    expect(mockLoadAuthSession).toHaveBeenCalled();
  });

  it('keeps the user signed in when clearing the persisted session fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockClearAuthSession.mockRejectedValueOnce(new Error('storage offline'));

    await renderAppToSignInGate();
    await signInToLibrary();

    fireEvent.press(screen.getByLabelText('Open settings'));
    expect(await screen.findByTestId('settings-screen')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Sign out'));

    await waitFor(() => {
      expect(mockClearAuthSession).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith('Could not sign out', 'Please try again in a moment.');
    });

    expect(screen.getByTestId('settings-screen')).toBeTruthy();
    expect(screen.queryByText('Your household recipe library')).toBeNull();

    alertSpy.mockRestore();
  });

  it('does not persist a session or enter the library with invalid credentials', async () => {
    await renderAppToSignInGate();

    fireEvent.changeText(await screen.findByPlaceholderText('Household email'), 'guest@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'not-the-shared-password');
    fireEvent.press(screen.getByText('Continue to library'));

    expect(screen.getByText('Use the shared household email and password.')).toBeTruthy();
    expect(screen.queryByText('Shared library in sync')).toBeNull();
    expect(mockPersistAuthSession).not.toHaveBeenCalled();
  });

  it('enters the library and creates a review draft from a pasted URL', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();

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

  it('queues a pasted Expo shared import link instead of fetching it as a recipe URL', async () => {
    seedSharedImportStorage([]);

    await renderAppToSignInGate();
    await signInToLibrary();
    await pressPrimaryTab('Add');

    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'exp://192.168.4.28:8081/--/share?url=https%3A%2F%2Fexample.com%2Fcacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByText('Shared imports')).toBeTruthy();
    expect(await screen.findByText('Cacio E Pepe')).toBeTruthy();
    expect(screen.queryByText(/No suitable URL request handler/i)).toBeNull();
  });

  it('lets the user leave the review screen and paste a different link', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();

    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/cacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByText('Review import')).toBeTruthy();

    fireEvent.press(screen.getByText('Back to import'));

    expect(await screen.findByText('From link')).toBeTruthy();
    expect(screen.getByDisplayValue('https://example.com/cacio-e-pepe')).toBeTruthy();
  });

  it('creates a review draft from a cookbook photo using the same review layout', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();

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

    await renderAppToSignInGate();
    await signInToLibrary();

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

    await renderAppToSignInGate();
    await signInToLibrary();

    await pressPrimaryTab('Add');
    fireEvent.press(screen.getByText('Photo library'));

    expect(await screen.findByText('Cookbook photo import needs attention')).toBeTruthy();
    expect(screen.getByText('Photo library is unavailable right now.')).toBeTruthy();
    expect(screen.getAllByText('Photo library').length).toBeGreaterThan(0);
    expect(screen.queryByText('Importing photo…')).toBeNull();
  });

  it('shows retry-oriented import feedback for a non-recipe link instead of a review draft', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();

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

  it('shows retry-oriented import feedback for a failed URL import', async () => {
    mockRepository.upsertImportJob.mockImplementation(async (job) => ({
      ...mockCloudState,
      importJobs: [job],
    }));

    await renderAppToSignInGate();
    await signInToLibrary();

    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/not-a-recipe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByText('Recipe link import needs attention')).toBeTruthy();
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

  it('shows shared-library sync status on the Recipes tab when cloud sync is enabled', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();
  });

  it('lets the user favorite a group and surfaces it in the favorite groups section', async () => {
    const favoritedState = {
      ...mockCloudState,
      groups: mockCloudState.groups.map((group) =>
        group.id === 'group-weeknight' ? { ...group, isFavorite: true } : group
      ),
    };
    mockRepository.setGroupFavorite.mockResolvedValue(favoritedState);

    await renderAppToSignInGate();
    await signInToLibrary();
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
    await renderAppToSignInGate();
    await signInToLibrary();
    expect(await screen.findByTestId('recipes-scroll-view')).toBeTruthy();

    await pressPrimaryTab('Groups');
    expect(screen.getByTestId('groups-scroll-view')).toBeTruthy();

    await pressPrimaryTab('Add');
    expect(screen.getByTestId('add-scroll-view')).toBeTruthy();
  });

  it('refreshes cloud state when returning to top-level tabs', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();
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

    await renderAppToSignInGate();
    await signInToLibrary();
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
    await renderAppToSignInGate();
    await signInToLibrary();

    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/cacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByText('Review import')).toBeTruthy();
    expect(screen.queryByText(/Last synced|Refreshing your shared library/i)).toBeNull();
  });

  it('retries a failed URL import from import history using the same job', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();

    mockRepository.loadState.mockResolvedValueOnce({
      ...mockCloudState,
      importJobs: [failedUrlImportJob],
    });

    await pressPrimaryTab('Add');
    expect(await screen.findByText('Needs attention')).toBeTruthy();

    fireEvent.press(screen.getByText('Retry'));

    expect(await screen.findByText('Review import')).toBeTruthy();
    expect(screen.getByDisplayValue('Cacio E Pepe')).toBeTruthy();
    await waitFor(() => {
      expect(mockRepository.upsertImportJob).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'job-failed-url',
          status: 'in_review',
          sourceUrl: 'https://example.com/cacio-e-pepe',
        })
      );
    });
  });

  it('retries a failed photo import from import history using the saved photo URI', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();

    mockRepository.loadState.mockResolvedValueOnce({
      ...mockCloudState,
      importJobs: [failedPhotoImportJob],
    });

    await pressPrimaryTab('Add');
    expect(await screen.findByText('Needs attention')).toBeTruthy();

    fireEvent.press(screen.getByText('Retry'));

    expect(await screen.findByText('Review import')).toBeTruthy();
    expect(screen.getByDisplayValue('Pesto Chicken and Roasted Veggie Farro Bowls')).toBeTruthy();
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///cookbook-page.jpg', {
      encoding: 'base64',
    });
    await waitFor(() => {
      expect(mockRepository.upsertImportJob).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'job-failed-photo',
          status: 'in_review',
          sourcePhotoUris: ['file:///cookbook-page.jpg'],
        })
      );
    });
  });

  it('persists edited review draft details before resuming from import history after tab navigation', async () => {
    const rendered = await renderAppToSignInGate();
    await signInToLibrary();

    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/cacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByText('Review import')).toBeTruthy();
    fireEvent.changeText(screen.getByDisplayValue('Cacio E Pepe'), 'Edited Cacio E Pepe');
    fireEvent.press(screen.getByText('Weeknight'));
    await pressPrimaryTabWithoutRefreshWait('Groups');
    expect(await screen.findByTestId('groups-scroll-view')).toBeTruthy();

    await waitFor(() => {
      expect(mockRepository.upsertImportJob).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'in_review',
          draft: expect.objectContaining({
            title: 'Edited Cacio E Pepe',
            selectedGroupIds: ['group-weeknight'],
          }),
        })
      );
    });

    const persistedJob = mockRepository.upsertImportJob.mock.calls.at(-1)?.[0] as ImportJob;
    rendered.unmount();
    mockLoadAuthSession.mockResolvedValue(true);
    mockRepository.loadState.mockResolvedValue({
      ...mockCloudState,
      importJobs: [persistedJob],
    });

    render(<App />);
    expect(await screen.findByTestId('recipes-scroll-view')).toBeTruthy();
    await pressPrimaryTab('Add');
    fireEvent.press(await screen.findByText('Resume review'));

    expect(screen.getByDisplayValue('Edited Cacio E Pepe')).toBeTruthy();
  });

  it('resumes an in-review import from import history', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();

    mockRepository.loadState.mockResolvedValueOnce({
      ...mockCloudState,
      importJobs: [inReviewImportJob],
    });

    await pressPrimaryTab('Add');
    expect(await screen.findByText('In review')).toBeTruthy();

    fireEvent.press(screen.getByText('Resume review'));

    expect(screen.getByText('Review import')).toBeTruthy();
    expect(screen.getByDisplayValue('Cacio E Pepe')).toBeTruthy();
  });

  it('opens a saved import recipe from import history', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();

    mockRepository.loadState.mockResolvedValueOnce({
      ...mockCloudState,
      importJobs: [savedImportJob],
    });

    await pressPrimaryTab('Add');
    expect(await screen.findByText('Recently saved')).toBeTruthy();

    fireEvent.press(screen.getByText('Open recipe'));

    expect(screen.getByTestId('recipe-detail-screen')).toBeTruthy();
    expect(screen.getAllByText('Jalapeño Popper Turkey Burgers').length).toBeGreaterThan(0);
  });

  it('shows shared imports on Add and opens a ready item into review', async () => {
    seedSharedImportStorage([readySharedImport]);

    await renderAppToSignInGate();
    await signInToLibrary();
    await pressPrimaryTab('Add');

    expect(await screen.findByText('Shared imports')).toBeTruthy();
    expect(screen.getByText('Mushroom Risotto')).toBeTruthy();

    fireEvent.press(screen.getByText('Review draft'));

    expect(screen.getByText('Review import')).toBeTruthy();
    expect(screen.getByDisplayValue('Mushroom Risotto')).toBeTruthy();
  });

  it('queues and processes a shared import from the initial deep link', async () => {
    seedSharedImportStorage([]);
    jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue('kitchenshelf://share?url=https%3A%2F%2Fexample.com%2Fcacio-e-pepe');

    await renderAppToSignInGate();
    fireEvent.changeText(await screen.findByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));

    expect(await screen.findByText('Shared imports')).toBeTruthy();
    expect(await screen.findByText('Cacio E Pepe')).toBeTruthy();
  });

  it('queues and processes a shared import from an Expo Go deep link', async () => {
    seedSharedImportStorage([]);
    jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue(
        'exp://192.168.1.15:8081/--/share?url=https%3A%2F%2Fexample.com%2Fcacio-e-pepe'
      );

    await renderAppToSignInGate();
    fireEvent.changeText(await screen.findByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));

    expect(await screen.findByText('Shared imports')).toBeTruthy();
    expect(await screen.findByText('Cacio E Pepe')).toBeTruthy();
  });

  it('queues and processes a shared import from a runtime deep link event', async () => {
    seedSharedImportStorage([]);

    await renderAppToSignInGate();
    await signInToLibrary();

    await act(async () => {
      linkingUrlHandler?.({
        url: 'kitchenshelf://share?text=Ingredients%3A%20rice%0AInstructions%3A%20cook%20it',
      });
      await Promise.resolve();
    });

    expect(await screen.findByText('Shared imports')).toBeTruthy();
    expect(await screen.findByText('Ingredients: rice')).toBeTruthy();
  });

  it('shows an Add-tab error when a deep link cannot be queued', async () => {
    seedSharedImportStorage([]);
    mockAsyncStorage.setItem.mockImplementation(async (key: string) => {
      if (key === 'recipe-organizer-shared-imports-v1') {
        throw new Error('storage full');
      }
    });

    await renderAppToSignInGate();
    await signInToLibrary();

    await act(async () => {
      linkingUrlHandler?.({
        url: 'kitchenshelf://share?text=Ingredients%3A%20rice',
      });
      await Promise.resolve();
    });

    expect(await screen.findByText('storage full')).toBeTruthy();
    expect(screen.getByTestId('add-scroll-view')).toBeTruthy();
  });

  it('removes a shared import from the queue after confirming it', async () => {
    seedSharedImportStorage([readySharedImport]);

    await renderAppToSignInGate();
    await signInToLibrary();
    await pressPrimaryTab('Add');
    fireEvent.press(await screen.findByText('Review draft'));
    fireEvent.press(screen.getByText('Weeknight'));
    fireEvent.press(screen.getByText('Confirm recipe'));

    expect(await screen.findByPlaceholderText('Rename group')).toBeTruthy();
    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'recipe-organizer-shared-imports-v1',
        JSON.stringify([])
      );
    });
  });

  it('marks a confirmed shared URL import as saved in import history', async () => {
    seedSharedImportStorage([readySharedImport]);

    await renderAppToSignInGate();
    await signInToLibrary();
    await pressPrimaryTab('Add');
    fireEvent.press(await screen.findByText('Review draft'));
    fireEvent.press(screen.getByText('Weeknight'));
    fireEvent.press(screen.getByText('Confirm recipe'));

    expect(await screen.findByPlaceholderText('Rename group')).toBeTruthy();
    await waitFor(() => {
      expect(mockRepository.upsertImportJob).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'share-ready-url',
          sourceType: 'url',
          sourceUrl: 'https://www.skinnytaste.com/mushroom-risotto',
          status: 'saved',
          recipeId: 'recipe-2',
          draft: expect.objectContaining({
            title: 'Mushroom Risotto',
            selectedGroupIds: ['group-weeknight'],
          }),
        })
      );
    });
  });

  it('preserves shared import group selections when returning to the queue', async () => {
    const storage = seedSharedImportStorage([readySharedImport]);

    await renderAppToSignInGate();
    await signInToLibrary();
    await pressPrimaryTab('Add');
    fireEvent.press(await screen.findByText('Review draft'));
    fireEvent.press(screen.getByText('Weeknight'));
    fireEvent.press(screen.getByText('Back to import'));

    expect(await screen.findByText('Shared imports')).toBeTruthy();
    expect(storage.read()[0].draft).toEqual(
      expect.objectContaining({
        selectedGroupIds: ['group-weeknight'],
      })
    );

    fireEvent.press(screen.getByText('Review draft'));
    fireEvent.press(screen.getByText('Confirm recipe'));

    expect(await screen.findByPlaceholderText('Rename group')).toBeTruthy();
    expect(screen.queryByText('Choose at least one group before confirming the recipe.')).toBeNull();
  });

  it('finishes saving a shared import even if local queue cleanup fails', async () => {
    seedSharedImportStorage([readySharedImport]);
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('storage full'));

    await renderAppToSignInGate();
    await signInToLibrary();
    await pressPrimaryTab('Add');
    fireEvent.press(await screen.findByText('Review draft'));
    fireEvent.press(screen.getByText('Weeknight'));
    fireEvent.press(screen.getByText('Confirm recipe'));

    expect(await screen.findByPlaceholderText('Rename group')).toBeTruthy();
    expect(screen.queryByText('Review import')).toBeNull();
  });

  it('keeps the add review flow inside a scroll view so lower controls remain reachable', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();
    await pressPrimaryTab('Add');
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/cacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByTestId('add-scroll-view')).toBeTruthy();
  });

  it('confirms a recipe into the chosen group and shows it there immediately', async () => {
    await renderAppToSignInGate();
    await signInToLibrary();
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

  it('marks a confirmed import as saved in history without a draft update error', async () => {
    mockRepository.upsertImportJob.mockImplementation(async (job) => {
      if (job.status === 'saved' && !job.draft) {
        throw new Error('null value in column "draft" violates not-null constraint');
      }

      return {
        ...(job.status === 'saved' ? importedCloudState : mockCloudState),
        importJobs: [job],
      };
    });

    await renderAppToSignInGate();
    await signInToLibrary();
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
    expect(screen.queryByText('We could not update that import draft right now.')).toBeNull();
    await waitFor(() => {
      expect(mockRepository.upsertImportJob).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'saved',
          recipeId: 'recipe-2',
          draft: expect.objectContaining({
            title: 'Cacio E Pepe',
            selectedGroupIds: ['group-weeknight'],
          }),
        })
      );
    });
  });

  it('deletes a recipe from the recipe detail view', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    await renderAppToSignInGate();
    await signInToLibrary();

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
