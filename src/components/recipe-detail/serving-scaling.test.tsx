import { fireEvent, render, screen } from '@testing-library/react-native';
import { RecipeDetailScreen, type RecipeDetailRecipe } from './RecipeDetailScreen';

const recipe: RecipeDetailRecipe = {
  title: 'Turkey burgers', servings: '6',
  ingredients: ['1 lb turkey', '1/2 tsp salt', 'Salt to taste'],
  instructions: ['Cook for 10 minutes.'],
};
const actions = { onClose: jest.fn(), onEdit: jest.fn(), onDelete: jest.fn(), onReplacePhoto: jest.fn() };

it('shows working serving controls for an Instagram recipe with a descriptive yield', () => {
  const importedRecipe = {
    ...recipe,
    title: 'Lentil & Quinoa Stuffed Artichoke Bottoms',
    sourceUrl: 'https://www.instagram.com/p/example/',
    servings: '6 stuffed artichoke bottoms',
    ingredients: ['6 artichoke bottoms', '1/2 cup quinoa'],
  };
  render(<RecipeDetailScreen recipe={importedRecipe} {...actions} />);
  expect(screen.getByLabelText('6 servings')).toBeTruthy();
  expect(screen.queryByText('Edit recipe to set a serving count, then scale ingredients here.')).toBeNull();
  fireEvent.press(screen.getByLabelText('Increase servings'));
  expect(screen.getByLabelText('7 servings')).toBeTruthy();
  expect(screen.getByText('7 artichoke bottoms')).toBeTruthy();
  expect(screen.getByText('0.58 cup quinoa')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Decrease servings'));
  expect(screen.getByText('6 artichoke bottoms')).toBeTruthy();
  expect(screen.getByText('1/2 cup quinoa')).toBeTruthy();
  expect(importedRecipe.servings).toBe('6 stuffed artichoke bottoms');
});

it('scales up and restores the original quantities without changing the saved recipe', () => {
  render(<RecipeDetailScreen recipe={recipe} {...actions} />);
  fireEvent.press(screen.getByLabelText('Increase servings'));
  fireEvent.press(screen.getByLabelText('Increase servings'));
  expect(screen.getByText('1.33 lb turkey')).toBeTruthy();
  expect(screen.getByText('0.67 tsp salt')).toBeTruthy();
  expect(screen.getByText('Salt to taste')).toBeTruthy();
  expect(screen.getByText('Cook for 10 minutes.')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Reset servings'));
  expect(screen.getByText('1/2 tsp salt')).toBeTruthy();
  expect(recipe.servings).toBe('6');
  expect(recipe.ingredients[0]).toBe('1 lb turkey');
});

it('stops at one serving', () => {
  render(<RecipeDetailScreen recipe={{ ...recipe, servings: '2' }} {...actions} />);
  fireEvent.press(screen.getByLabelText('Decrease servings'));
  expect(screen.getByText('0.5 lb turkey')).toBeTruthy();
  expect(screen.getByLabelText('Decrease servings')).toBeDisabled();
});

it.each([undefined, '4–6'])('explains an unscalable serving count (%s)', (servings) => {
  render(<RecipeDetailScreen recipe={{ ...recipe, servings }} {...actions} />);
  expect(screen.queryByLabelText('Increase servings')).toBeNull();
  expect(screen.getByText('Edit recipe to set a serving count, then scale ingredients here.')).toBeTruthy();
  expect(screen.getByText('1 lb turkey')).toBeTruthy();
});

it('resets when switching recipes or changing original quantities', () => {
  const { rerender } = render(<RecipeDetailScreen recipe={recipe} {...actions} />);
  fireEvent.press(screen.getByLabelText('Increase servings'));
  rerender(<RecipeDetailScreen recipe={{ ...recipe, title: 'Another recipe' }} {...actions} />);
  expect(screen.getByText('1 lb turkey')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Increase servings'));
  rerender(<RecipeDetailScreen recipe={{ ...recipe, ingredients: ['2 lb turkey'] }} {...actions} />);
  expect(screen.getByText('2 lb turkey')).toBeTruthy();
});

it('starts at the saved amounts after closing and reopening', () => {
  const first = render(<RecipeDetailScreen recipe={recipe} {...actions} />);
  fireEvent.press(screen.getByLabelText('Increase servings'));
  first.unmount();
  render(<RecipeDetailScreen recipe={recipe} {...actions} />);
  expect(screen.getByText('1 lb turkey')).toBeTruthy();
});

it('does not restore an old selection when switching back to a recipe', () => {
  const { rerender } = render(<RecipeDetailScreen recipe={recipe} {...actions} />);
  fireEvent.press(screen.getByLabelText('Increase servings'));
  rerender(<RecipeDetailScreen recipe={{ ...recipe, title: 'Another recipe' }} {...actions} />);
  rerender(<RecipeDetailScreen recipe={recipe} {...actions} />);
  expect(screen.getByText('1 lb turkey')).toBeTruthy();
});

it('keeps scaling when unrelated photo metadata changes', () => {
  const { rerender } = render(<RecipeDetailScreen recipe={recipe} {...actions} />);
  fireEvent.press(screen.getByLabelText('Increase servings'));
  rerender(<RecipeDetailScreen recipe={{ ...recipe, heroImageUri: 'file:///new-photo.jpg' }} {...actions} />);
  expect(screen.getByText('1.17 lb turkey')).toBeTruthy();
});

it('stops at the upper serving limit', () => {
  render(<RecipeDetailScreen recipe={{ ...recipe, servings: '999' }} {...actions} />);
  expect(screen.getByLabelText('Increase servings')).toBeDisabled();
  expect(screen.getByLabelText('Decrease servings')).toBeEnabled();
});
