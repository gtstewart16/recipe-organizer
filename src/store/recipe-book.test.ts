import {
  createEmptyRecipeBookState,
  createRecipeBookDraftFromPhoto,
  createRecipeBookDraftFromUrl,
  recipeBookReducer,
  selectFilteredRecipes,
} from './recipe-book';

describe('recipe book domain', () => {
  it('creates a URL import draft with normalized title and source attribution', () => {
    const draft = createRecipeBookDraftFromUrl(
      'https://www.bonappetit.com/recipe/one-pan-lemony-chicken-and-rice'
    );

    expect(draft.sourceType).toBe('url');
    expect(draft.sourceUrl).toBe(
      'https://www.bonappetit.com/recipe/one-pan-lemony-chicken-and-rice'
    );
    expect(draft.title).toBe('One Pan Lemony Chicken And Rice');
    expect(draft.ingredients).toHaveLength(3);
    expect(draft.instructions).toHaveLength(3);
    expect(draft.status).toBe('needs_review');
    expect(draft.prepTime).toBeUndefined();
    expect(draft.cookTime).toBeUndefined();
  });

  it('creates a photo import draft that preserves selected asset paths', () => {
    const draft = createRecipeBookDraftFromPhoto([
      'file:///cookbook-page-1.jpg',
      'file:///cookbook-page-2.jpg',
    ]);

    expect(draft.sourceType).toBe('photo');
    expect(draft.sourcePhotoUris).toEqual([
      'file:///cookbook-page-1.jpg',
      'file:///cookbook-page-2.jpg',
    ]);
    expect(draft.title).toBe('Cookbook Recipe Draft');
    expect(draft.heroImageUri).toBe('file:///cookbook-page-1.jpg');
  });

  it('preserves prep and cook times when importing a recipe into the library', () => {
    const state = recipeBookReducer(
      recipeBookReducer(createEmptyRecipeBookState(), {
        type: 'group/created',
        payload: { id: 'group-weeknight', name: 'Weeknight' } as any,
      }),
      {
        type: 'recipe/imported',
        payload: {
          draft: {
            ...createRecipeBookDraftFromUrl('https://example.com/slow-cooker-chili'),
            prepTime: '20 mins',
            cookTime: '6 hours',
          },
          groupIds: ['group-weeknight'],
        },
      }
    );

    expect(state.recipes[0]).toMatchObject({
      prepTime: '20 mins',
      cookTime: '6 hours',
    });
  });

  it('saves a reviewed import into the library and supports many groups per recipe', () => {
    const state = createEmptyRecipeBookState();
    const breakfastGroupId = 'group-breakfast';
    const healthyGroupId = 'group-healthy';

    const withGroups = recipeBookReducer(state, {
      type: 'group/created',
      payload: { id: breakfastGroupId, name: 'Weeknight' } as any,
    });
    const withTwoGroups = recipeBookReducer(withGroups, {
      type: 'group/created',
      payload: { id: healthyGroupId, name: 'Healthy' } as any,
    });

    const imported = recipeBookReducer(withTwoGroups, {
      type: 'recipe/imported',
      payload: {
        draft: {
          ...createRecipeBookDraftFromUrl('https://example.com/spicy-salmon-bowls'),
          title: 'Spicy Salmon Bowls',
        },
        groupIds: [breakfastGroupId, healthyGroupId],
      },
    });

    expect(imported.recipes).toHaveLength(1);
    expect(imported.memberships).toEqual([
      { groupId: breakfastGroupId, recipeId: imported.recipes[0].id },
      { groupId: healthyGroupId, recipeId: imported.recipes[0].id },
    ]);
  });

  it('defaults created groups to unfavorited and toggles favorite state on and off', () => {
    const created = recipeBookReducer(createEmptyRecipeBookState(), {
      type: 'group/created',
      payload: { id: 'group-weeknight', name: 'Weeknight' } as any,
    });

    expect(created.groups[0]).toMatchObject({
      id: 'group-weeknight',
      name: 'Weeknight',
      isFavorite: false,
    });

    const favorited = recipeBookReducer(created, {
      type: 'group/favoriteToggled',
      payload: { id: 'group-weeknight', isFavorite: true },
    } as any);

    expect(favorited.groups[0].isFavorite).toBe(true);

    const unfavorited = recipeBookReducer(favorited, {
      type: 'group/favoriteToggled',
      payload: { id: 'group-weeknight', isFavorite: false },
    } as any);

    expect(unfavorited.groups[0].isFavorite).toBe(false);
  });

  it('deleting a group removes memberships but keeps recipes', () => {
    const base = recipeBookReducer(createEmptyRecipeBookState(), {
      type: 'group/created',
      payload: { id: 'group-favorites', name: 'Favorites' } as any,
    });
    const withRecipe = recipeBookReducer(base, {
      type: 'recipe/imported',
      payload: {
        draft: createRecipeBookDraftFromUrl('https://example.com/greek-chicken-dinner'),
        groupIds: ['group-favorites'],
      },
    });

    const afterDelete = recipeBookReducer(withRecipe, {
      type: 'group/deleted',
      payload: { id: 'group-favorites' },
    });

    expect(afterDelete.groups).toHaveLength(0);
    expect(afterDelete.recipes).toHaveLength(1);
    expect(afterDelete.memberships).toHaveLength(0);
  });

  it('renames a group without changing its recipe memberships', () => {
    const base = recipeBookReducer(createEmptyRecipeBookState(), {
      type: 'group/created',
      payload: { id: 'group-weeknight', name: 'Weeknight' } as any,
    });
    const withRecipe = recipeBookReducer(base, {
      type: 'recipe/imported',
      payload: {
        draft: createRecipeBookDraftFromUrl('https://example.com/creamy-tuscan-orzo'),
        groupIds: ['group-weeknight'],
      },
    });

    const renamed = recipeBookReducer(withRecipe, {
      type: 'group/renamed',
      payload: { id: 'group-weeknight', name: 'Fast Dinners' },
    });

    expect(renamed.groups[0].name).toBe('Fast Dinners');
    expect(renamed.memberships).toEqual(withRecipe.memberships);
  });

  it('updates a saved recipe and replaces its group memberships', () => {
    const base = recipeBookReducer(
      recipeBookReducer(createEmptyRecipeBookState(), {
        type: 'group/created',
        payload: { id: 'group-weeknight', name: 'Weeknight' } as any,
      }),
      {
        type: 'group/created',
        payload: { id: 'group-weekend', name: 'Weekend' } as any,
      }
    );

    const withRecipe = recipeBookReducer(base, {
      type: 'recipe/imported',
      payload: {
        draft: createRecipeBookDraftFromUrl('https://example.com/hot-honey-salmon'),
        groupIds: ['group-weeknight'],
      },
    });

    const updated = recipeBookReducer(withRecipe, {
      type: 'recipe/updated',
      payload: {
        recipeId: withRecipe.recipes[0].id,
        draft: {
          ...withRecipe.recipes[0],
          title: 'Hot Honey Salmon Bowls',
          ingredients: ['1 salmon fillet', '2 tablespoons hot honey'],
          instructions: ['Roast the salmon.', 'Serve with rice and cucumbers.'],
          status: 'ready',
        },
        groupIds: ['group-weekend'],
      },
    });

    expect(updated.recipes[0].title).toBe('Hot Honey Salmon Bowls');
    expect(updated.memberships).toEqual([
      { groupId: 'group-weekend', recipeId: withRecipe.recipes[0].id },
    ]);
  });

  it('deletes a recipe and removes its group memberships', () => {
    const base = recipeBookReducer(
      recipeBookReducer(createEmptyRecipeBookState(), {
        type: 'group/created',
        payload: { id: 'group-weeknight', name: 'Weeknight' } as any,
      }),
      {
        type: 'group/created',
        payload: { id: 'group-weekend', name: 'Weekend' } as any,
      }
    );

    const withRecipe = recipeBookReducer(base, {
      type: 'recipe/imported',
      payload: {
        draft: createRecipeBookDraftFromUrl('https://example.com/one-pot-orzo'),
        groupIds: ['group-weeknight', 'group-weekend'],
      },
    });

    const deleted = recipeBookReducer(withRecipe, {
      type: 'recipe/deleted',
      payload: { recipeId: withRecipe.recipes[0].id },
    });

    expect(deleted.recipes).toHaveLength(0);
    expect(deleted.memberships).toHaveLength(0);
  });

  it('searches recipes by title and group name', () => {
    const state = recipeBookReducer(
      recipeBookReducer(createEmptyRecipeBookState(), {
        type: 'group/created',
        payload: { id: 'group-weeknight', name: 'Weeknight' } as any,
      }),
      {
        type: 'recipe/imported',
        payload: {
          draft: {
            ...createRecipeBookDraftFromUrl('https://example.com/jalapeno-popper-turkey-burgers'),
            title: 'Jalapeño Popper Turkey Burgers',
          },
          groupIds: ['group-weeknight'],
        },
      }
    );

    expect(selectFilteredRecipes(state, 'burger')).toHaveLength(1);
    expect(selectFilteredRecipes(state, 'weeknight')).toHaveLength(1);
    expect(selectFilteredRecipes(state, 'dessert')).toHaveLength(0);
  });
});
