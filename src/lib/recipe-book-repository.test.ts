import { createRecipeBookDraftFromUrl, ImportJob, RecipeBookState, RecipeDraft } from '../store/recipe-book';
import { createRecipeBookRepository, RecipeBookPersistence } from './recipe-book-repository';

describe('recipe book repository', () => {
  it('bootstraps a shared household and default groups when the cloud is empty', async () => {
    const persistence = createInMemoryPersistence();
    const repository = createRecipeBookRepository(persistence);

    const state = await repository.loadState();

    expect(state.groups.map((group) => group.name)).toEqual(['Weeknight', 'Weekend', 'Healthy']);
    expect(state.groups.every((group) => group.isFavorite === false)).toBe(true);
    expect(state.recipes).toEqual([]);
    expect(state.memberships).toEqual([]);
  });

  it('repairs missing default groups when some defaults already exist', async () => {
    const persistence = createInMemoryPersistence({
      seedGroups: ['Weeknight', 'Healthy'],
    });
    const repository = createRecipeBookRepository(persistence);

    const state = await repository.loadState();

    expect(state.groups.map((group) => group.name)).toEqual(['Weeknight', 'Healthy', 'Weekend']);
  });

  it('loads persisted import jobs when hydrating the cloud-backed state', async () => {
    const persistence = createInMemoryPersistence();
    const repository = createRecipeBookRepository(persistence);
    const household = await persistence.createHousehold('The Kitchen');

    const job: ImportJob = {
      id: 'job-1',
      sourceType: 'url',
      sourceUrl: 'https://example.com/cacio-e-pepe',
      sourcePhotoUris: [],
      title: 'Cacio e Pepe',
      status: 'in_review',
      errorMessage: undefined,
      draft: createRecipeBookDraftFromUrl('https://example.com/cacio-e-pepe'),
      recipeId: undefined,
      createdAt: '2026-04-04T12:00:00.000Z',
      updatedAt: '2026-04-04T12:05:00.000Z',
    };

    await persistence.upsertImportJob(household.id, job);

    const state = await repository.loadState();

    expect(state.importJobs).toEqual([job]);
  });

  it('persists imported recipes and group memberships in the cloud-backed state', async () => {
    const persistence = createInMemoryPersistence();
    const repository = createRecipeBookRepository(persistence);
    const initial = await repository.loadState();
    const weeknightGroupId = initial.groups.find((group) => group.name === 'Weeknight')!.id;

    const draft: RecipeDraft = {
      ...createRecipeBookDraftFromUrl('https://example.com/cacio-e-pepe'),
      title: 'Cacio E Pepe',
      ingredients: ['12 ounces spaghetti', '2 cups pecorino romano'],
      instructions: ['Cook the pasta.', 'Toss with cheese and pepper.'],
      servings: '4',
      status: 'ready',
    };

    const state = await repository.importRecipe(draft, [weeknightGroupId]);

    expect(state.recipes).toHaveLength(1);
    expect(state.recipes[0].title).toBe('Cacio E Pepe');
    expect(state.memberships).toEqual([
      {
        recipeId: state.recipes[0].id,
        groupId: weeknightGroupId,
      },
    ]);
  });

  it('deletes the inserted recipe if membership replacement fails during import', async () => {
    const persistence = createInMemoryPersistence();
    const repository = createRecipeBookRepository(persistence);
    const initial = await repository.loadState();
    const weeknightGroupId = initial.groups.find((group) => group.name === 'Weeknight')!.id;

    const draft: RecipeDraft = {
      ...createRecipeBookDraftFromUrl('https://example.com/cacio-e-pepe'),
      title: 'Cacio E Pepe',
      status: 'ready',
    };

    persistence.failNextReplaceMemberships();

    await expect(repository.importRecipe(draft, [weeknightGroupId])).rejects.toThrow('replace memberships failed');

    expect(getSnapshot(persistence).recipes).toHaveLength(0);
  });

  it('persists and reloads recipe prep and cook time values', async () => {
    const persistence = createInMemoryPersistence();
    const repository = createRecipeBookRepository(persistence);
    const initial = await repository.loadState();
    const weeknightGroupId = initial.groups.find((group) => group.name === 'Weeknight')!.id;

    const draft: RecipeDraft = {
      ...createRecipeBookDraftFromUrl('https://example.com/slow-cooker-chili'),
      title: 'Slow Cooker Chili',
      prepTime: '20 mins',
      cookTime: '6 hours',
      status: 'ready',
    };

    const state = await repository.importRecipe(draft, [weeknightGroupId]);

    expect(state.recipes[0]).toMatchObject({
      prepTime: '20 mins',
      cookTime: '6 hours',
    });
  });

  it('persists and reloads a group favorite state from the cloud-backed repository', async () => {
    const persistence = createInMemoryPersistence();
    const repository = createRecipeBookRepository(persistence);

    const initial = await repository.loadState();
    const weekendGroupId = initial.groups.find((group) => group.name === 'Weekend')!.id;

    await (repository as any).setGroupFavorite(weekendGroupId, true);

    const reloaded = await repository.loadState();
    const weekendGroup = reloaded.groups.find((group) => group.id === weekendGroupId);

    expect(weekendGroup?.isFavorite).toBe(true);
  });

  it('restores the previous recipe draft and memberships if membership replacement fails during update', async () => {
    const persistence = createInMemoryPersistence();
    const repository = createRecipeBookRepository(persistence);
    const initial = await repository.loadState();
    const weeknightGroupId = initial.groups.find((group) => group.name === 'Weeknight')!.id;
    const weekendGroupId = initial.groups.find((group) => group.name === 'Weekend')!.id;

    const originalDraft: RecipeDraft = {
      ...createRecipeBookDraftFromUrl('https://example.com/cacio-e-pepe'),
      title: 'Cacio E Pepe',
      ingredients: ['12 ounces spaghetti'],
      instructions: ['Cook the pasta.'],
      status: 'ready',
    };

    const seeded = await repository.importRecipe(originalDraft, [weeknightGroupId]);
    const recipeId = seeded.recipes[0].id;

    const updatedDraft: RecipeDraft = {
      ...originalDraft,
      title: 'Cacio E Pepe With Lemon',
      ingredients: ['12 ounces spaghetti', '1 lemon'],
      instructions: ['Cook the pasta.', 'Finish with lemon zest.'],
    };

    persistence.failNextReplaceMemberships();

    await expect(repository.updateRecipe(recipeId, updatedDraft, [weekendGroupId])).rejects.toThrow(
      'replace memberships failed'
    );

    const snapshot = getSnapshot(persistence);
    expect(snapshot.recipes).toEqual([
      expect.objectContaining({
        id: recipeId,
        title: 'Cacio E Pepe',
        ingredients: ['12 ounces spaghetti'],
        instructions: ['Cook the pasta.'],
      }),
    ]);
    expect(snapshot.memberships).toEqual([
      {
        recipeId,
        groupId: weeknightGroupId,
      },
    ]);
  });

  it('rejects missing recipes before mutating memberships during update', async () => {
    let memberships = [{ recipeId: 'recipe-stale', groupId: 'group-old' }];
    const persistence: RecipeBookPersistence = {
      async getHousehold() {
        return { id: 'household-1', name: 'The Kitchen' };
      },
      async createHousehold() {
        return { id: 'household-1', name: 'The Kitchen' };
      },
      async listGroups() {
        return [
          {
            id: 'group-old',
            householdId: 'household-1',
            name: 'Weeknight',
            isFavorite: false,
            createdAt: '2026-04-04T12:00:00.000Z',
            updatedAt: '2026-04-04T12:00:00.000Z',
          },
          {
            id: 'group-new',
            householdId: 'household-1',
            name: 'Weekend',
            isFavorite: false,
            createdAt: '2026-04-04T12:00:00.000Z',
            updatedAt: '2026-04-04T12:00:00.000Z',
          },
        ];
      },
      async insertGroup() {},
      async renameGroup() {},
      async setGroupFavorite() {},
      async deleteGroup() {},
      async listRecipes() {
        return [];
      },
      async insertRecipe() {
        throw new Error('not expected');
      },
      async updateRecipe() {},
      async deleteRecipe() {},
      async listMemberships() {
        return memberships;
      },
      async replaceMemberships() {
        memberships = [{ recipeId: 'recipe-stale', groupId: 'group-old' }];
      },
      async listImportJobs() {
        return [];
      },
      async upsertImportJob() {
        throw new Error('not expected');
      },
    };
    const repository = createRecipeBookRepository(persistence);
    const draft: RecipeDraft = {
      ...createRecipeBookDraftFromUrl('https://example.com/cacio-e-pepe'),
      title: 'Cacio E Pepe Updated',
      status: 'ready',
    };

    await expect(repository.updateRecipe('recipe-stale', draft, ['group-new'])).rejects.toThrow(
      'Recipe no longer exists.'
    );

    expect(memberships).toEqual([{ recipeId: 'recipe-stale', groupId: 'group-old' }]);
  });
});

function createInMemoryPersistence(options?: { seedGroups?: string[] }): RecipeBookPersistence & {
  failNextReplaceMemberships(): void;
  __debug: {
    households: { id: string; name: string }[];
    groups: {
      id: string;
      householdId: string;
      name: string;
      isFavorite: boolean;
      createdAt: string;
      updatedAt: string;
    }[];
    importJobs: {
      id: string;
      householdId: string;
      sourceType: 'url' | 'photo';
      sourceUrl?: string;
      sourcePhotoUris: string[];
      title: string;
      status: 'failed' | 'in_review' | 'saved';
      errorMessage?: string;
      draft?: RecipeDraft;
      recipeId?: string;
      createdAt: string;
      updatedAt: string;
    }[];
    recipes: {
      id: string;
      householdId: string;
      title: string;
      description?: string;
      heroImageUri?: string;
      sourceUrl?: string;
      sourceType: RecipeDraft['sourceType'];
      sourcePhotoUris: string[];
      ingredients: string[];
      instructions: string[];
      servings?: string;
      prepTime?: string;
      cookTime?: string;
      status: RecipeDraft['status'];
      createdAt: string;
      updatedAt: string;
    }[];
    memberships: RecipeBookState['memberships'];
  };
} {
  const now = '2026-04-04T12:00:00.000Z';
  const households: { id: string; name: string }[] = [];
  const groups: {
    id: string;
    householdId: string;
    name: string;
    isFavorite: boolean;
    createdAt: string;
    updatedAt: string;
  }[] = [];
  const importJobs: {
    id: string;
    householdId: string;
    sourceType: 'url' | 'photo';
    sourceUrl?: string;
    sourcePhotoUris: string[];
    title: string;
    status: 'failed' | 'in_review' | 'saved';
    errorMessage?: string;
    draft?: RecipeDraft;
    recipeId?: string;
    createdAt: string;
    updatedAt: string;
  }[] = [];
  const recipes: {
    id: string;
    householdId: string;
    title: string;
    description?: string;
    heroImageUri?: string;
    sourceUrl?: string;
    sourceType: RecipeDraft['sourceType'];
    sourcePhotoUris: string[];
    ingredients: string[];
    instructions: string[];
    servings?: string;
    prepTime?: string;
    cookTime?: string;
    status: RecipeDraft['status'];
    createdAt: string;
    updatedAt: string;
  }[] = [];
  let memberships: RecipeBookState['memberships'] = [];
  let nextId = 1;
  let failReplaceMembershipsOnce = false;

  const makeId = (prefix: string) => `${prefix}-${nextId++}`;
  const createGroup = (householdId: string, name: string) => {
    groups.push({
      id: makeId('group'),
      householdId,
      name,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    });
  };

  if ((options?.seedGroups ?? []).length > 0) {
    const household = { id: makeId('household'), name: 'The Kitchen' };
    households.push(household);

    for (const name of options?.seedGroups ?? []) {
      createGroup(household.id, name);
    }
  }

  const persistence = {
    async getHousehold() {
      return households[0] ?? null;
    },
    async createHousehold(name: string) {
      const household = { id: makeId('household'), name };
      households.push(household);
      return household;
    },
    async listGroups(householdId: string) {
      return groups.filter((group) => group.householdId === householdId);
    },
    async listImportJobs(householdId: string) {
      return importJobs.filter((job) => job.householdId === householdId);
    },
    async insertGroup(householdId: string, name: string) {
      createGroup(householdId, name);
    },
    async upsertImportJob(householdId: string, job: ImportJob) {
      const nextJob = {
        ...job,
        householdId,
      };
      const index = importJobs.findIndex((item) => item.id === job.id);
      if (index >= 0) {
        importJobs[index] = nextJob;
        return nextJob;
      }

      importJobs.unshift(nextJob);
      return nextJob;
    },
    async renameGroup(groupId: string, name: string) {
      const group = groups.find((item) => item.id === groupId);
      if (group) {
        group.name = name;
        group.updatedAt = now;
      }
    },
    async setGroupFavorite(groupId: string, isFavorite: boolean) {
      const group = groups.find((item) => item.id === groupId);
      if (group) {
        group.isFavorite = isFavorite;
        group.updatedAt = now;
      }
    },
    async deleteGroup(groupId: string) {
      const index = groups.findIndex((group) => group.id === groupId);
      if (index >= 0) {
        groups.splice(index, 1);
      }
      memberships = memberships.filter((membership) => membership.groupId !== groupId);
    },
    async listRecipes(householdId: string) {
      return recipes.filter((recipe) => recipe.householdId === householdId);
    },
    async insertRecipe(householdId: string, draft: RecipeDraft) {
      const recipe = {
        id: makeId('recipe'),
        householdId,
        title: draft.title,
        description: draft.description,
        heroImageUri: draft.heroImageUri,
        sourceUrl: draft.sourceUrl,
        sourceType: draft.sourceType,
        sourcePhotoUris: draft.sourcePhotoUris,
        ingredients: draft.ingredients,
        instructions: draft.instructions,
        servings: draft.servings,
        prepTime: draft.prepTime,
        cookTime: draft.cookTime,
        status: draft.status,
        createdAt: now,
        updatedAt: now,
      };
      recipes.unshift(recipe);
      return recipe;
    },
    async updateRecipe(recipeId: string, draft: RecipeDraft) {
      const recipe = recipes.find((item) => item.id === recipeId);
      if (recipe) {
        Object.assign(recipe, {
          title: draft.title,
          description: draft.description,
          heroImageUri: draft.heroImageUri,
          sourceUrl: draft.sourceUrl,
          sourceType: draft.sourceType,
          sourcePhotoUris: draft.sourcePhotoUris,
          ingredients: draft.ingredients,
          instructions: draft.instructions,
          servings: draft.servings,
          prepTime: draft.prepTime,
          cookTime: draft.cookTime,
          status: draft.status,
          updatedAt: now,
        });
      }
    },
    async deleteRecipe(recipeId: string) {
      const index = recipes.findIndex((recipe) => recipe.id === recipeId);
      if (index >= 0) {
        recipes.splice(index, 1);
      }
      memberships = memberships.filter((membership) => membership.recipeId !== recipeId);
    },
    async listMemberships(groupIds: string[]) {
      return memberships.filter((membership) => groupIds.includes(membership.groupId));
    },
    async replaceMemberships(recipeId: string, groupIds: string[]) {
      if (failReplaceMembershipsOnce) {
        failReplaceMembershipsOnce = false;
        throw new Error('replace memberships failed');
      }

      memberships = memberships.filter((membership) => membership.recipeId !== recipeId);
      memberships.push(...groupIds.map((groupId) => ({ recipeId, groupId })));
    },
    failNextReplaceMemberships() {
      failReplaceMembershipsOnce = true;
    },
    __debug: {
      households,
      groups,
      importJobs,
      recipes,
      get memberships() {
        return memberships;
      },
    },
  };

  return persistence as RecipeBookPersistence & {
    failNextReplaceMemberships(): void;
    __debug: {
      households: { id: string; name: string }[];
      groups: {
        id: string;
        householdId: string;
        name: string;
        isFavorite: boolean;
        createdAt: string;
        updatedAt: string;
      }[];
      importJobs: {
        id: string;
        householdId: string;
        sourceType: 'url' | 'photo';
        sourceUrl?: string;
        sourcePhotoUris: string[];
        title: string;
        status: 'failed' | 'in_review' | 'saved';
        errorMessage?: string;
        draft?: RecipeDraft;
        recipeId?: string;
        createdAt: string;
        updatedAt: string;
      }[];
      recipes: {
        id: string;
        householdId: string;
        title: string;
        description?: string;
        heroImageUri?: string;
        sourceUrl?: string;
        sourceType: RecipeDraft['sourceType'];
        sourcePhotoUris: string[];
        ingredients: string[];
        instructions: string[];
        servings?: string;
        prepTime?: string;
        cookTime?: string;
        status: RecipeDraft['status'];
        createdAt: string;
        updatedAt: string;
      }[];
      memberships: RecipeBookState['memberships'];
    };
  };
}

function getSnapshot(persistence: ReturnType<typeof createInMemoryPersistence>) {
  return persistence.__debug;
}
