import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecipeDetailScreen } from './RecipeDetailScreen';
import { RecipeDirectionsSection } from './RecipeDirectionsSection';
import { RecipeIngredientsSection } from './RecipeIngredientsSection';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');

  return {
    SafeAreaInsetsContext: React.createContext({
      top: 28,
      right: 0,
      bottom: 0,
      left: 0,
    }),
  };
});

const recipe = {
  title: 'Pesto Chicken and Roasted Veggie Farro Bowls',
  description: 'A cozy weeknight bowl with plenty of vegetables.',
  heroImageUri: 'https://images.example.com/pesto-bowl.jpg',
  sourceUrl: 'https://example.com/pesto-bowl',
  servings: '4',
  prepTime: '20 mins',
  cookTime: '35 mins',
  ingredients: ['1 pound chicken cutlets', '4 cups broccoli florets'],
  instructions: ['Marinate the chicken.', 'Roast the vegetables and serve with farro.'],
};

describe('RecipeDetailScreen', () => {
  it('renders a full-page recipe detail surface with hero, actions, and content', () => {
    const onClose = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const onOpenSource = jest.fn();

    render(
      <RecipeDetailScreen
        recipe={recipe}
        groupNames={['Weeknight', 'Healthy']}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
        onOpenSource={onOpenSource}
      />
    );

    expect(screen.getByText('Pesto Chicken and Roasted Veggie Farro Bowls')).toBeTruthy();
    expect(screen.queryByText('Recipe Organizer')).toBeNull();
    expect(screen.getByText('A cozy weeknight bowl with plenty of vegetables.')).toBeTruthy();
    expect(screen.getByText('Servings')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('Prep')).toBeTruthy();
    expect(screen.getByText('20 mins')).toBeTruthy();
    expect(screen.getByText('Cook')).toBeTruthy();
    expect(screen.getByText('35 mins')).toBeTruthy();
    expect(screen.getByText('Weeknight')).toBeTruthy();
    expect(screen.getByText('Healthy')).toBeTruthy();
    expect(screen.getByText('Ingredients')).toBeTruthy();
    expect(screen.getByText('Directions')).toBeTruthy();
    expect(screen.getByText('Edit recipe')).toBeTruthy();
    expect(screen.getByText('Delete recipe')).toBeTruthy();
    expect(screen.getByText('Source')).toBeTruthy();
    expect(screen.getByText('example.com')).toBeTruthy();
    expect(screen.getByText('Open original recipe')).toBeTruthy();
    expect(screen.getByTestId('recipe-detail-hero-image')).toBeTruthy();
    expect(screen.getByLabelText('Close recipe detail')).toBeTruthy();
    expect(screen.getByTestId('recipe-detail-close-button')).toBeTruthy();

    fireEvent.press(screen.getByText('Edit recipe'));
    fireEvent.press(screen.getByTestId('recipe-detail-delete-button'));
    fireEvent.press(screen.getByText('Open original recipe'));
    fireEvent.press(screen.getByLabelText('Close recipe detail'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onOpenSource).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a designed fallback when no hero image is available', () => {
    render(
      <RecipeDetailScreen
        recipe={{
          ...recipe,
          heroImageUri: undefined,
          sourceUrl: undefined,
        }}
        groupNames={[]}
        onClose={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByTestId('recipe-detail-hero-fallback')).toBeTruthy();
    expect(screen.queryByText('Open original recipe')).toBeNull();
  });

  it('keeps the close affordance below the safe area and shows metadata labels even when values are missing', () => {
    render(
      <RecipeDetailScreen
        recipe={{
          ...recipe,
          servings: undefined,
          prepTime: undefined,
          cookTime: undefined,
        }}
        groupNames={['Weeknight']}
        onClose={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByTestId('recipe-detail-close-chrome')).toHaveStyle({ top: 42 });
    expect(screen.getByText('Servings')).toBeTruthy();
    expect(screen.getByText('Prep')).toBeTruthy();
    expect(screen.getByText('Cook')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });
});

describe('RecipeIngredientsSection', () => {
  it('renders ingredient lines as a clear scan-friendly list', () => {
    render(<RecipeIngredientsSection ingredients={recipe.ingredients} />);

    expect(screen.getByText('Ingredients')).toBeTruthy();
    expect(screen.getByText('1 pound chicken cutlets')).toBeTruthy();
    expect(screen.getByText('4 cups broccoli florets')).toBeTruthy();
  });
});

describe('RecipeDirectionsSection', () => {
  it('renders numbered directions as separated steps', () => {
    render(<RecipeDirectionsSection instructions={recipe.instructions} />);

    expect(screen.getByText('Directions')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('Marinate the chicken.')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('Roast the vegetables and serve with farro.')).toBeTruthy();
  });
});
