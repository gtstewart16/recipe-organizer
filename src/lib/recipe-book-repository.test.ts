import { createRecipeBookDraftFromUrl, RecipeBookState, RecipeDraft } from '../store/recipe-book';
import { createRecipeBookRepository, RecipeBookPersistence } from './recipe-book-repository';

describe('recipe book repository', () => {
  it('bootstraps a shared household and default groups when the cloud is empty', async () => {
    const persistence = createInMemoryPersistence();
    const repository = createRecipeBookRepository(persistence);

    const state = await repository.loadState();

    expect(state.groups.map((group) => group.name)).toEqual(['Weeknight', 'Weekend', 'Healthy']);
    expect(state.recipes).toEqual([]);
    expect(state.memberships).toEqual([]);
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
});

function createInMemoryPersistence(): RecipeBookPersistence {
  const now = '2026-04-04T12:00:00.000Z';
  const households: { id: string; name: string }[] = [];
  const groups: {
    id: string;
    householdId: string;
    name: string;
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
    status: RecipeDraft['status'];
    createdAt: string;
    updatedAt: string;
  }[] = [];
  let memberships: RecipeBookState['memberships'] = [];
  let nextId = 1;

  const makeId = (prefix: string) => `${prefix}-${nextId++}`;

  return {
    async getHousehold() {
      return households[0] ?? null;
    },
    async createHousehold(name) {
      const household = { id: makeId('household'), name };
      households.push(household);
      return household;
    },
    async listGroups(householdId) {
      return groups.filter((group) => group.householdId === householdId);
    },
    async insertGroup(householdId, name) {
      groups.push({
        id: makeId('group'),
        householdId,
        name,
        createdAt: now,
        updatedAt: now,
      });
    },
    async renameGroup(groupId, name) {
      const group = groups.find((item) => item.id === groupId);
      if (group) {
        group.name = name;
        group.updatedAt = now;
      }
    },
    async deleteGroup(groupId) {
      const index = groups.findIndex((group) => group.id === groupId);
      if (index >= 0) {
        groups.splice(index, 1);
      }
      memberships = memberships.filter((membership) => membership.groupId !== groupId);
    },
    async listRecipes(householdId) {
      return recipes.filter((recipe) => recipe.householdId === householdId);
    },
    async insertRecipe(householdId, draft) {
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
        status: draft.status,
        createdAt: now,
        updatedAt: now,
      };
      recipes.unshift(recipe);
      return recipe;
    },
    async updateRecipe(recipeId, draft) {
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
          status: draft.status,
          updatedAt: now,
        });
      }
    },
    async deleteRecipe(recipeId) {
      const index = recipes.findIndex((recipe) => recipe.id === recipeId);
      if (index >= 0) {
        recipes.splice(index, 1);
      }
      memberships = memberships.filter((membership) => membership.recipeId !== recipeId);
    },
    async listMemberships(groupIds) {
      return memberships.filter((membership) => groupIds.includes(membership.groupId));
    },
    async replaceMemberships(recipeId, groupIds) {
      memberships = memberships.filter((membership) => membership.recipeId !== recipeId);
      memberships.push(...groupIds.map((groupId) => ({ recipeId, groupId })));
    },
  };
}
