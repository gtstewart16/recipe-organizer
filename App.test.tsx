import { fireEvent, render, screen } from '@testing-library/react-native';

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

describe('Recipe Organizer app', () => {
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

    expect(screen.getAllByText('Recipes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Groups').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Add').length).toBeGreaterThan(0);

    fireEvent.press(screen.getByText('Add'));
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

    fireEvent.press(screen.getByText('Add'));
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

    fireEvent.press(screen.getByText('Add'));
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

    fireEvent.press(screen.getByText('Add'));
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

  it('keeps the add review flow inside a scroll view so lower controls remain reachable', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));
    fireEvent.press(screen.getByText('Add'));
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
    fireEvent.press(screen.getByText('Add'));
    fireEvent.changeText(
      screen.getByPlaceholderText('https://example.com/cacio-e-pepe'),
      'https://example.com/cacio-e-pepe'
    );
    fireEvent.press(screen.getByText('Create review draft'));

    expect(await screen.findByText('Review import')).toBeTruthy();

    fireEvent.press(screen.getByText('Weeknight'));
    fireEvent.press(screen.getByText('Confirm recipe'));

    expect(await screen.findByPlaceholderText('Rename group')).toBeTruthy();
    expect(screen.getByText('Cacio E Pepe')).toBeTruthy();
  });

  it('deletes a recipe from the recipe detail view', async () => {
    render(<App />);

    fireEvent.changeText(screen.getByPlaceholderText('Household email'), 'home@kitchen.test');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Continue to library'));

    fireEvent.press(screen.getByText('Jalapeño Popper Turkey Burgers'));
    expect(await screen.findByText('Open original recipe')).toBeTruthy();

    fireEvent.press(screen.getByText('Delete recipe'));

    expect(screen.queryByText('Jalapeño Popper Turkey Burgers')).toBeNull();
  });
});
