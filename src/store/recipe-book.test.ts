import {
  createEmptyRecipeBookState,
  createRecipeBookDraftFromPhoto,
  createRecipeBookDraftFromUrl,
  recipeBookReducer,
  selectImportHistory,
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
        payload: { id: 'group-weeknight', name: 'Weeknight' },
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
      payload: { id: breakfastGroupId, name: 'Weeknight' },
    });
    const withTwoGroups = recipeBookReducer(withGroups, {
      type: 'group/created',
      payload: { id: healthyGroupId, name: 'Healthy' },
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

  it('stores failed import jobs newest-first', () => {
    const initial = createEmptyRecipeBookState();

    const withOlderJob = recipeBookReducer(initial, {
      type: 'importJob/upserted',
      payload: {
        id: 'job-1',
        sourceType: 'url',
        sourceUrl: 'https://example.com/fail',
        sourcePhotoUris: [],
        title: 'Example import',
        status: 'failed',
        errorMessage: 'No recipe found in the provided text.',
        createdAt: '2026-04-05T10:00:00.000Z',
        updatedAt: '2026-04-05T10:00:00.000Z',
      },
    });

    const next = recipeBookReducer(withOlderJob, {
      type: 'importJob/upserted',
      payload: {
        id: 'job-2',
        sourceType: 'photo',
        sourcePhotoUris: ['file:///cookbook-page-1.jpg'],
        title: 'Photo import',
        status: 'failed',
        errorMessage: 'The image does not contain a recipe.',
        createdAt: '2026-04-05T10:02:00.000Z',
        updatedAt: '2026-04-05T10:02:00.000Z',
      },
    });

    expect(next.importJobs).toHaveLength(2);
    expect(next.importJobs.map((job) => job.id)).toEqual(['job-2', 'job-1']);
    expect(next.importJobs[0].status).toBe('failed');
    expect(next.importJobs[0].errorMessage).toBe('The image does not contain a recipe.');
  });

  it('updates an existing import job instead of duplicating it', () => {
    const initial = {
      ...createEmptyRecipeBookState(),
      importJobs: [
        {
          id: 'job-1',
          sourceType: 'url' as const,
          sourceUrl: 'https://example.com/fail',
          sourcePhotoUris: [],
          title: 'Example import',
          status: 'failed' as const,
          createdAt: '2026-04-05T10:00:00.000Z',
          updatedAt: '2026-04-05T10:00:00.000Z',
        },
      ],
    };

    const next = recipeBookReducer(initial, {
      type: 'importJob/upserted',
      payload: {
        ...initial.importJobs[0],
        status: 'in_review',
        title: 'Recovered draft',
        draft: createRecipeBookDraftFromUrl('https://example.com/fail'),
        updatedAt: '2026-04-05T10:05:00.000Z',
      },
    });

    expect(next.importJobs).toHaveLength(1);
    expect(next.importJobs[0].status).toBe('in_review');
    expect(next.importJobs[0].title).toBe('Recovered draft');
  });

  it('removes import jobs by id', () => {
    const state = {
      ...createEmptyRecipeBookState(),
      importJobs: [
        {
          id: 'job-1',
          sourceType: 'url' as const,
          sourceUrl: 'https://example.com/first',
          sourcePhotoUris: [],
          title: 'First import',
          status: 'failed' as const,
          errorMessage: 'Missing steps',
          createdAt: '2026-04-05T10:00:00.000Z',
          updatedAt: '2026-04-05T10:00:00.000Z',
        },
        {
          id: 'job-2',
          sourceType: 'photo' as const,
          sourcePhotoUris: ['file:///second.jpg'],
          title: 'Second import',
          status: 'saved' as const,
          recipeId: 'recipe-2',
          createdAt: '2026-04-05T10:05:00.000Z',
          updatedAt: '2026-04-05T10:05:00.000Z',
        },
      ],
    };

    const next = recipeBookReducer(state, {
      type: 'importJob/removed',
      payload: { id: 'job-1' },
    });

    expect(next.importJobs).toHaveLength(1);
    expect(next.importJobs[0].id).toBe('job-2');
  });

  it('generates a recipe id from existing recipe ids instead of array length', () => {
    const state = {
      ...createEmptyRecipeBookState(),
      recipes: [
        {
          ...createRecipeBookDraftFromUrl('https://example.com/first'),
          id: 'recipe-1',
          createdAt: '2026-04-05T08:00:00.000Z',
          updatedAt: '2026-04-05T08:00:00.000Z',
        },
        {
          ...createRecipeBookDraftFromUrl('https://example.com/third'),
          id: 'recipe-3',
          createdAt: '2026-04-05T08:30:00.000Z',
          updatedAt: '2026-04-05T08:30:00.000Z',
        },
      ],
    };

    const next = recipeBookReducer(state, {
      type: 'recipe/imported',
      payload: {
        draft: createRecipeBookDraftFromUrl('https://example.com/fourth'),
        groupIds: [],
      },
    });

    expect(next.recipes[0].id).toBe('recipe-4');
  });

  it('selects import history by status and caps saved jobs at five', () => {
    const state = {
      ...createEmptyRecipeBookState(),
      importJobs: [
        {
          id: 'job-saved-1',
          sourceType: 'url' as const,
          sourceUrl: 'https://example.com/saved-1',
          sourcePhotoUris: [],
          title: 'Saved 1',
          status: 'saved' as const,
          recipeId: 'recipe-1',
          createdAt: '2026-04-05T09:00:00.000Z',
          updatedAt: '2026-04-05T09:00:00.000Z',
        },
        {
          id: 'job-failed-1',
          sourceType: 'url' as const,
          sourceUrl: 'https://example.com/failed-1',
          sourcePhotoUris: [],
          title: 'Failed 1',
          status: 'failed' as const,
          errorMessage: 'Missing instructions',
          createdAt: '2026-04-05T09:05:00.000Z',
          updatedAt: '2026-04-05T09:05:00.000Z',
        },
        {
          id: 'job-saved-6',
          sourceType: 'photo' as const,
          sourcePhotoUris: ['file:///saved-6.jpg'],
          title: 'Saved 6',
          status: 'saved' as const,
          recipeId: 'recipe-6',
          createdAt: '2026-04-05T09:10:00.000Z',
          updatedAt: '2026-04-05T09:10:00.000Z',
        },
        {
          id: 'job-in-review-1',
          sourceType: 'photo' as const,
          sourcePhotoUris: ['file:///review-1.jpg'],
          title: 'Review 1',
          status: 'in_review' as const,
          draft: createRecipeBookDraftFromPhoto(['file:///review-1.jpg']),
          createdAt: '2026-04-05T09:15:00.000Z',
          updatedAt: '2026-04-05T09:15:00.000Z',
        },
        {
          id: 'job-saved-5',
          sourceType: 'url' as const,
          sourceUrl: 'https://example.com/saved-5',
          sourcePhotoUris: [],
          title: 'Saved 5',
          status: 'saved' as const,
          recipeId: 'recipe-5',
          createdAt: '2026-04-05T09:20:00.000Z',
          updatedAt: '2026-04-05T09:20:00.000Z',
        },
        {
          id: 'job-saved-4',
          sourceType: 'url' as const,
          sourceUrl: 'https://example.com/saved-4',
          sourcePhotoUris: [],
          title: 'Saved 4',
          status: 'saved' as const,
          recipeId: 'recipe-4',
          createdAt: '2026-04-05T09:25:00.000Z',
          updatedAt: '2026-04-05T09:25:00.000Z',
        },
        {
          id: 'job-saved-3',
          sourceType: 'url' as const,
          sourceUrl: 'https://example.com/saved-3',
          sourcePhotoUris: [],
          title: 'Saved 3',
          status: 'saved' as const,
          recipeId: 'recipe-3',
          createdAt: '2026-04-05T09:30:00.000Z',
          updatedAt: '2026-04-05T09:30:00.000Z',
        },
        {
          id: 'job-saved-2',
          sourceType: 'url' as const,
          sourceUrl: 'https://example.com/saved-2',
          sourcePhotoUris: [],
          title: 'Saved 2',
          status: 'saved' as const,
          recipeId: 'recipe-2',
          createdAt: '2026-04-05T09:35:00.000Z',
          updatedAt: '2026-04-05T09:35:00.000Z',
        },
      ],
    };

    const history = selectImportHistory(state);

    expect(history.failed.map((job) => job.id)).toEqual(['job-failed-1']);
    expect(history.inReview.map((job) => job.id)).toEqual(['job-in-review-1']);
    expect(history.saved.map((job) => job.id)).toEqual([
      'job-saved-2',
      'job-saved-3',
      'job-saved-4',
      'job-saved-5',
      'job-saved-6',
    ]);
  });

  it('defaults created groups to unfavorited and toggles favorite state on and off', () => {
    const created = recipeBookReducer(createEmptyRecipeBookState(), {
      type: 'group/created',
      payload: { id: 'group-weeknight', name: 'Weeknight' },
    });

    expect(created.groups[0]).toMatchObject({
      id: 'group-weeknight',
      name: 'Weeknight',
      isFavorite: false,
    });

    const favorited = recipeBookReducer(created, {
      type: 'group/favoriteToggled',
      payload: { id: 'group-weeknight', isFavorite: true },
    });

    expect(favorited.groups[0].isFavorite).toBe(true);

    const unfavorited = recipeBookReducer(favorited, {
      type: 'group/favoriteToggled',
      payload: { id: 'group-weeknight', isFavorite: false },
    });

    expect(unfavorited.groups[0].isFavorite).toBe(false);
  });

  it('deleting a group removes memberships but keeps recipes', () => {
    const base = recipeBookReducer(createEmptyRecipeBookState(), {
      type: 'group/created',
      payload: { id: 'group-favorites', name: 'Favorites' },
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
      payload: { id: 'group-weeknight', name: 'Weeknight' },
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
        payload: { id: 'group-weeknight', name: 'Weeknight' },
      }),
      {
        type: 'group/created',
        payload: { id: 'group-weekend', name: 'Weekend' },
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
        payload: { id: 'group-weeknight', name: 'Weeknight' },
      }),
      {
        type: 'group/created',
        payload: { id: 'group-weekend', name: 'Weekend' },
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
        payload: { id: 'group-weeknight', name: 'Weeknight' },
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
