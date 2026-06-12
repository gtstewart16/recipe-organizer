import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecipeCard, RecipesHome } from './recipes-home';
import type { RecipeGroup, RecipeRecord } from '../../store/recipe-book';

const groups: RecipeGroup[] = [
  { id: 'group-weeknight', name: 'Weeknight', isFavorite: true },
  { id: 'group-weekend', name: 'Weekend', isFavorite: false },
];

const recipes: RecipeRecord[] = [
  {
    id: 'recipe-1',
    title: 'Smash Burger Tacos',
    description: 'A quick weeknight favorite.',
    heroImageUri: 'https://images.example.com/tacos.jpg',
    sourceUrl: 'https://example.com/smash-burger-tacos',
    sourceType: 'url',
    sourcePhotoUris: [],
    ingredients: ['1 pound ground beef'],
    instructions: ['Cook the beef.'],
    servings: '4',
    status: 'ready',
    createdAt: '2026-04-05T12:00:00.000Z',
    updatedAt: '2026-04-05T12:00:00.000Z',
  },
  {
    id: 'recipe-2',
    title: 'Cacio e Pepe',
    description: undefined,
    heroImageUri: undefined,
    sourceUrl: 'https://example.com/cacio-e-pepe',
    sourceType: 'url',
    sourcePhotoUris: [],
    ingredients: ['12 ounces spaghetti'],
    instructions: ['Cook the pasta.'],
    servings: '2',
    status: 'ready',
    createdAt: '2026-04-05T12:10:00.000Z',
    updatedAt: '2026-04-05T12:10:00.000Z',
  },
];

describe('RecipesHome', () => {
  it('renders the browse-first home with favorite groups and recent recipes', () => {
    render(
      <RecipesHome
        groups={groups}
        recipes={recipes}
        searchQuery=""
        onSearchQueryChange={jest.fn()}
        onGroupPress={jest.fn()}
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
        favoriteGroupIds={['group-weeknight']}
        onFavoriteGroupToggle={jest.fn()}
      />
    );

    expect(screen.getByText('Recipes')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search recipes or groups')).toBeTruthy();
    expect(screen.getByText('Favorite groups')).toBeTruthy();
    expect(screen.getByText('Recent recipes')).toBeTruthy();
    expect(screen.getByText('Weeknight')).toBeTruthy();
    expect(screen.getByText('Smash Burger Tacos')).toBeTruthy();
    expect(screen.getByTestId('favorite-group-star-group-weeknight')).toBeTruthy();
    expect(screen.queryByText('Weekend')).toBeNull();
  });

  it('calls back when a favorite group or recipe card is pressed', () => {
    const onGroupPress = jest.fn();
    const onRecipePress = jest.fn();
    const onRecipeDelete = jest.fn();
    const onFavoriteGroupToggle = jest.fn();

    render(
      <RecipesHome
        groups={groups}
        recipes={recipes}
        searchQuery=""
        onSearchQueryChange={jest.fn()}
        onGroupPress={onGroupPress}
        onRecipePress={onRecipePress}
        onRecipeDelete={onRecipeDelete}
        favoriteGroupIds={['group-weeknight']}
        onFavoriteGroupToggle={onFavoriteGroupToggle}
      />
    );

    fireEvent.press(screen.getByText('Weeknight'));
    fireEvent.press(screen.getByTestId('favorite-group-star-group-weeknight'));
    fireEvent.press(screen.getByText('Smash Burger Tacos'));

    expect(onGroupPress).toHaveBeenCalledWith(groups[0]);
    expect(onFavoriteGroupToggle).toHaveBeenCalledWith(groups[0]);
    expect(onRecipePress).toHaveBeenCalledWith(recipes[0]);
    expect(onRecipeDelete).not.toHaveBeenCalled();
  });

  it('shows an image-led recipe card fallback when no hero image is available', () => {
    render(
      <RecipesHome
        groups={groups}
        recipes={[recipes[1]]}
        searchQuery=""
        onSearchQueryChange={jest.fn()}
        onGroupPress={jest.fn()}
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
        favoriteGroupIds={[]}
      />
    );

    expect(screen.getByText('Cacio e Pepe')).toBeTruthy();
    expect(screen.getByText('No image yet')).toBeTruthy();
    expect(screen.getByTestId('recipe-card-fallback')).toBeTruthy();
  });

  it('shows an empty state when no groups are favorited yet', () => {
    render(
      <RecipesHome
        groups={groups.map((group) => ({ ...group, isFavorite: false }))}
        recipes={recipes}
        searchQuery=""
        onSearchQueryChange={jest.fn()}
        onGroupPress={jest.fn()}
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
        favoriteGroupIds={[]}
      />
    );

    expect(screen.getByText('No favorite groups yet')).toBeTruthy();
  });

  it('renders compact favorite group tiles with star affordances', () => {
    render(
      <RecipesHome
        groups={groups}
        recipes={recipes}
        searchQuery=""
        onSearchQueryChange={jest.fn()}
        onGroupPress={jest.fn()}
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
        favoriteGroupIds={['group-weeknight']}
        onFavoriteGroupToggle={jest.fn()}
      />
    );

    expect(screen.getByTestId('favorite-group-tile-group-weeknight')).toHaveStyle({
      minHeight: 84,
      minWidth: 138,
    });
    expect(screen.getByTestId('favorite-group-star-group-weeknight')).toBeTruthy();
  });

  it('wraps recipe cards in swipe delete rows when delete handling is provided', () => {
    render(
      <RecipesHome
        groups={groups}
        recipes={recipes}
        searchQuery=""
        onSearchQueryChange={jest.fn()}
        onGroupPress={jest.fn()}
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
        favoriteGroupIds={['group-weeknight']}
        onFavoriteGroupToggle={jest.fn()}
      />
    );

    expect(screen.getByTestId('recipe-card-delete-recipe-1')).toBeTruthy();
    expect(screen.getByTestId('recipe-card-content-recipe-1')).toBeTruthy();
  });

  it('shows a search-empty state when a query has no matching recipes or groups', () => {
    render(
      <RecipesHome
        groups={[]}
        recipes={[]}
        searchQuery="sourdough"
        onSearchQueryChange={jest.fn()}
        onGroupPress={jest.fn()}
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
        favoriteGroupIds={[]}
      />
    );

    expect(screen.getByText('No matches for "sourdough"')).toBeTruthy();
    expect(screen.getByText('Try another search or clear the shelf to see everything again.')).toBeTruthy();
    expect(screen.queryByText('No recipes yet')).toBeNull();
  });

  it('does not duplicate the servings unit when recipe servings already include it', () => {
    render(
      <RecipeCard
        recipe={{
          ...recipes[0],
          servings: '4 servings',
        }}
        onPress={jest.fn()}
      />
    );

    expect(screen.getAllByText('4 servings')).toHaveLength(2);
    expect(screen.queryAllByText('4 servings servings')).toHaveLength(0);
  });
});
