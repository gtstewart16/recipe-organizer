import { fireEvent, render, screen } from '@testing-library/react-native';
import { RecipeDetailScreen, type RecipeDetailRecipe } from './RecipeDetailScreen';
import { importRecipeFromUrl } from '../../services/url-import';

const recipe: RecipeDetailRecipe = {
  id: 'serving-test', title: 'Serving test', servings: '4',
  ingredients: ['1 lb beef', '1/2 tsp salt', 'Salt to taste'],
  instructions: ['Cook for 10 minutes.'],
};
const actions = { onClose: jest.fn(), onEdit: jest.fn(), onDelete: jest.fn(), onReplacePhoto: jest.fn() };

it.each(['Serving: 4', 'Serving(s): 4', '4 portion(s)', '4 person(s)', '4 servings.', 'Yield: 4 serving(s).'])(
  'shows working controls for %s', (servings) => {
    render(<RecipeDetailScreen recipe={{ ...recipe, servings }} {...actions} />);
    expect(screen.getByLabelText('4 servings')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Increase servings'));
    expect(screen.getByText('1.25 lb beef')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Reset servings'));
    expect(screen.getByText('1/2 tsp salt')).toBeTruthy();
  }
);

it('enables controls after editing an ambiguous serving count', () => {
  const { rerender } = render(<RecipeDetailScreen recipe={{ ...recipe, servings: '4–6' }} {...actions} />);
  expect(screen.queryByLabelText('Increase servings')).toBeNull();
  rerender(<RecipeDetailScreen recipe={recipe} {...actions} />);
  fireEvent.press(screen.getByLabelText('Increase servings'));
  expect(screen.getByText('1.25 lb beef')).toBeTruthy();
  rerender(<RecipeDetailScreen recipe={{ ...recipe, servings: 'unknown' }} {...actions} />);
  expect(screen.queryByLabelText('Increase servings')).toBeNull();
  expect(screen.queryByLabelText('Reset servings')).toBeNull();
  expect(screen.getByText('1 lb beef')).toBeTruthy();
});

it('uses the new base count after editing an already-scaled recipe', () => {
  const { rerender } = render(<RecipeDetailScreen recipe={recipe} {...actions} />);
  fireEvent.press(screen.getByLabelText('Increase servings'));
  rerender(<RecipeDetailScreen recipe={{ ...recipe, servings: '2' }} {...actions} />);
  expect(screen.getByLabelText('2 servings')).toBeTruthy();
  expect(screen.getByText('1 lb beef')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Increase servings'));
  expect(screen.getByText('1.5 lb beef')).toBeTruthy();
});

it('resets when switching between different recipes with identical content', () => {
  const { rerender } = render(<RecipeDetailScreen recipe={recipe} {...actions} />);
  fireEvent.press(screen.getByLabelText('Increase servings'));
  rerender(<RecipeDetailScreen recipe={{ ...recipe, id: 'another-recipe' }} {...actions} />);
  expect(screen.getByLabelText('4 servings')).toBeTruthy();
  expect(screen.getByText('1 lb beef')).toBeTruthy();
});

it.each([
  { servings: '2', direction: 'Decrease', opposite: 'Increase', label: '1 serving' },
  { servings: '998', direction: 'Increase', opposite: 'Decrease', label: '999 servings' },
])('stops repeated presses at $label and allows movement back', ({ servings, direction, opposite, label }) => {
  render(<RecipeDetailScreen recipe={{ ...recipe, servings }} {...actions} />);
  fireEvent.press(screen.getByLabelText(`${direction} servings`));
  fireEvent.press(screen.getByLabelText(`${direction} servings`));
  expect(screen.getByLabelText(label)).toBeTruthy();
  expect(screen.getByLabelText(`${direction} servings`)).toBeDisabled();
  fireEvent.press(screen.getByLabelText(`${opposite} servings`));
  expect(screen.getByLabelText(`${servings} servings`)).toBeTruthy();
  expect(screen.getByText('1/2 tsp salt')).toBeTruthy();
});

it('scales an imported numeric yield through the real detail screen', async () => {
  const schema = {
    '@type': 'Recipe', name: recipe.title, recipeYield: 4,
    recipeIngredient: recipe.ingredients, recipeInstructions: recipe.instructions,
  };
  const draft = await importRecipeFromUrl('https://example.com/recipe', {
    fetcher: async () => new Response(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`),
  });
  render(<RecipeDetailScreen recipe={draft} {...actions} />);
  fireEvent.press(screen.getByLabelText('Decrease servings'));
  expect(screen.getByLabelText('3 servings')).toBeTruthy();
  expect(screen.getByText('0.75 lb beef')).toBeTruthy();
  expect(screen.getByText('Salt to taste')).toBeTruthy();
  expect(screen.getByText('Cook for 10 minutes.')).toBeTruthy();
  expect(draft.servings).toBe('4');
  expect(draft.ingredients).toEqual(recipe.ingredients);
});
