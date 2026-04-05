import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

const mockCloudState = {
  groups: [
    { id: 'group-weeknight', name: 'Weeknight' },
    { id: 'group-weekend', name: 'Weekend' },
    { id: 'group-healthy', name: 'Healthy' },
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
};

const importedCloudState = {
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
  deleteGroup: jest.fn(async () => mockCloudState),
  importRecipe: jest.fn(async () => importedCloudState),
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
    ingredients: ['1 pound chicken cutlets, sliced in half', '4 cups broccoli florets'],
    instructions: ['Marinate the chicken.', 'Roast the vegetables and serve with farro.'],
    servings: '4',
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

describe('Recipe Organizer app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository.loadState.mockResolvedValue(mockCloudState);
    mockRepository.createGroup.mockResolvedValue(mockCloudState);
    mockRepository.renameGroup.mockResolvedValue(mockCloudState);
    mockRepository.deleteGroup.mockResolvedValue(mockCloudState);
    mockRepository.importRecipe.mockResolvedValue(importedCloudState);
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
    expect(screen.getByText('Review import')).toBeTruthy();
    expect(screen.getByText('Confirm recipe')).toBeTruthy();
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
    expect(screen.getByText('This link does not appear to contain a recipe.')).toBeTruthy();
    expect(screen.getByText('Try another link')).toBeTruthy();
    expect(screen.queryByText('Review import')).toBeNull();
  });

  it('shows shared-library sync status on the Recipes tab when cloud sync is enabled', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));

    expect(await screen.findByText('Shared library in sync')).toBeTruthy();
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
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    expect(await screen.findByText('Shared library in sync')).toBeTruthy();

    fireEvent.press(screen.getByText('Jalapeño Popper Turkey Burgers'));
    expect(await screen.findByText('Open original recipe')).toBeTruthy();

    fireEvent.press(screen.getByText('Delete recipe'));

    await waitFor(() => {
      expect(screen.queryAllByText('Jalapeño Popper Turkey Burgers')).toHaveLength(0);
    });
  });
});
