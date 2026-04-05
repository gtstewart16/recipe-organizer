import { SupabaseClient } from '@supabase/supabase-js';

import { RecipeBookState, RecipeDraft, RecipeRecord } from '../store/recipe-book';

const DEFAULT_HOUSEHOLD_NAME = 'The Kitchen';
const DEFAULT_GROUP_NAMES = ['Weeknight', 'Weekend', 'Healthy'];

type HouseholdRow = {
  id: string;
  name: string;
};

type GroupRow = {
  id: string;
  householdId: string;
  name: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

type RecipeRow = {
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
};

export type RecipeBookPersistence = {
  getHousehold(): Promise<HouseholdRow | null>;
  createHousehold(name: string): Promise<HouseholdRow>;
  listGroups(householdId: string): Promise<GroupRow[]>;
  insertGroup(householdId: string, name: string, isFavorite?: boolean): Promise<void>;
  renameGroup(groupId: string, name: string): Promise<void>;
  setGroupFavorite(groupId: string, isFavorite: boolean): Promise<void>;
  deleteGroup(groupId: string): Promise<void>;
  listRecipes(householdId: string): Promise<RecipeRow[]>;
  insertRecipe(householdId: string, draft: RecipeDraft): Promise<RecipeRow>;
  updateRecipe(recipeId: string, draft: RecipeDraft): Promise<void>;
  deleteRecipe(recipeId: string): Promise<void>;
  listMemberships(groupIds: string[]): Promise<RecipeBookState['memberships']>;
  replaceMemberships(recipeId: string, groupIds: string[]): Promise<void>;
};

export function createRecipeBookRepository(persistence: RecipeBookPersistence) {
  return {
    loadState: async (): Promise<RecipeBookState> => {
      const household = await ensureHousehold(persistence);
      await ensureDefaultGroups(persistence, household.id);
      return loadRecipeBookState(persistence, household.id);
    },
    createGroup: async (name: string): Promise<RecipeBookState> => {
      const household = await ensureHousehold(persistence);
      await persistence.insertGroup(household.id, name);
      return loadRecipeBookState(persistence, household.id);
    },
    renameGroup: async (groupId: string, name: string): Promise<RecipeBookState> => {
      const household = await ensureHousehold(persistence);
      await persistence.renameGroup(groupId, name);
      return loadRecipeBookState(persistence, household.id);
    },
    setGroupFavorite: async (groupId: string, isFavorite: boolean): Promise<RecipeBookState> => {
      const household = await ensureHousehold(persistence);
      await persistence.setGroupFavorite(groupId, isFavorite);
      return loadRecipeBookState(persistence, household.id);
    },
    deleteGroup: async (groupId: string): Promise<RecipeBookState> => {
      const household = await ensureHousehold(persistence);
      await persistence.deleteGroup(groupId);
      return loadRecipeBookState(persistence, household.id);
    },
    importRecipe: async (draft: RecipeDraft, groupIds: string[]): Promise<RecipeBookState> => {
      const household = await ensureHousehold(persistence);
      const recipe = await persistence.insertRecipe(household.id, draft);
      await persistence.replaceMemberships(recipe.id, groupIds);
      return loadRecipeBookState(persistence, household.id);
    },
    updateRecipe: async (recipeId: string, draft: RecipeDraft, groupIds: string[]): Promise<RecipeBookState> => {
      const household = await ensureHousehold(persistence);
      await persistence.updateRecipe(recipeId, draft);
      await persistence.replaceMemberships(recipeId, groupIds);
      return loadRecipeBookState(persistence, household.id);
    },
    deleteRecipe: async (recipeId: string): Promise<RecipeBookState> => {
      const household = await ensureHousehold(persistence);
      await persistence.deleteRecipe(recipeId);
      return loadRecipeBookState(persistence, household.id);
    },
  };
}

export function createSupabaseRecipeBookPersistence(client: SupabaseClient): RecipeBookPersistence {
  return {
    async getHousehold() {
      const { data, error } = await client
        .from('households')
        .select('id, name')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapHouseholdRow(data) : null;
    },
    async createHousehold(name) {
      const { data, error } = await client.from('households').insert({ name }).select('id, name').single();

      if (error) {
        throw error;
      }

      return mapHouseholdRow(data);
    },
    async listGroups(householdId) {
      const { data, error } = await client
        .from('recipe_groups')
        .select('id, household_id, name, is_favorite, created_at, updated_at')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapGroupRow);
    },
    async insertGroup(householdId, name, isFavorite = false) {
      const { error } = await client.from('recipe_groups').insert({
        household_id: householdId,
        name,
        is_favorite: isFavorite,
      });

      if (error) {
        throw error;
      }
    },
    async renameGroup(groupId, name) {
      const { error } = await client
        .from('recipe_groups')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', groupId);

      if (error) {
        throw error;
      }
    },
    async setGroupFavorite(groupId, isFavorite) {
      const { error } = await client
        .from('recipe_groups')
        .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
        .eq('id', groupId);

      if (error) {
        throw error;
      }
    },
    async deleteGroup(groupId) {
      const { error } = await client.from('recipe_groups').delete().eq('id', groupId);

      if (error) {
        throw error;
      }
    },
    async listRecipes(householdId) {
      const { data, error } = await client
        .from('recipes')
        .select(
          'id, household_id, title, description, hero_image_url, source_url, source_type, source_photo_uris, ingredients, instructions, servings, prep_time, cook_time, status, created_at, updated_at'
        )
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapRecipeRow);
    },
    async insertRecipe(householdId, draft) {
      const { data, error } = await client
        .from('recipes')
        .insert(mapRecipeDraftForInsert(householdId, draft))
        .select(
          'id, household_id, title, description, hero_image_url, source_url, source_type, source_photo_uris, ingredients, instructions, servings, prep_time, cook_time, status, created_at, updated_at'
        )
        .single();

      if (error) {
        throw error;
      }

      return mapRecipeRow(data);
    },
    async updateRecipe(recipeId, draft) {
      const { error } = await client
        .from('recipes')
        .update(mapRecipeDraftForUpdate(draft))
        .eq('id', recipeId);

      if (error) {
        throw error;
      }
    },
    async deleteRecipe(recipeId) {
      const { error } = await client.from('recipes').delete().eq('id', recipeId);

      if (error) {
        throw error;
      }
    },
    async listMemberships(groupIds) {
      if (groupIds.length === 0) {
        return [];
      }

      const { data, error } = await client
        .from('recipe_group_memberships')
        .select('recipe_id, group_id')
        .in('group_id', groupIds);

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => ({
        recipeId: row.recipe_id as string,
        groupId: row.group_id as string,
      }));
    },
    async replaceMemberships(recipeId, groupIds) {
      const { error: deleteError } = await client.from('recipe_group_memberships').delete().eq('recipe_id', recipeId);

      if (deleteError) {
        throw deleteError;
      }

      if (groupIds.length === 0) {
        return;
      }

      const { error: insertError } = await client.from('recipe_group_memberships').insert(
        groupIds.map((groupId) => ({
          recipe_id: recipeId,
          group_id: groupId,
        }))
      );

      if (insertError) {
        throw insertError;
      }
    },
  };
}

async function ensureHousehold(persistence: RecipeBookPersistence): Promise<HouseholdRow> {
  const existing = await persistence.getHousehold();

  if (existing) {
    return existing;
  }

  return persistence.createHousehold(DEFAULT_HOUSEHOLD_NAME);
}

async function ensureDefaultGroups(persistence: RecipeBookPersistence, householdId: string) {
  const groups = await persistence.listGroups(householdId);

  if (groups.length > 0) {
    return;
  }

  for (const name of DEFAULT_GROUP_NAMES) {
    await persistence.insertGroup(householdId, name);
  }
}

async function loadRecipeBookState(persistence: RecipeBookPersistence, householdId: string): Promise<RecipeBookState> {
  const groups = await persistence.listGroups(householdId);
  const recipes = await persistence.listRecipes(householdId);
  const memberships = await persistence.listMemberships(groups.map((group) => group.id));

  return {
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      isFavorite: group.isFavorite ?? false,
    })),
    recipes: recipes.map(mapStateRecipe),
    memberships,
  };
}

function mapHouseholdRow(row: Record<string, unknown>): HouseholdRow {
  return {
    id: row.id as string,
    name: row.name as string,
  };
}

function mapGroupRow(row: Record<string, unknown>): GroupRow {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    name: row.name as string,
    isFavorite: (row.is_favorite as boolean | null) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapRecipeRow(row: Record<string, unknown>): RecipeRow {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    heroImageUri: (row.hero_image_url as string | null) ?? undefined,
    sourceUrl: (row.source_url as string | null) ?? undefined,
    sourceType: row.source_type as RecipeDraft['sourceType'],
    sourcePhotoUris: ((row.source_photo_uris as string[] | null) ?? []) as string[],
    ingredients: ((row.ingredients as string[] | null) ?? []) as string[],
    instructions: ((row.instructions as string[] | null) ?? []) as string[],
    servings: (row.servings as string | null) ?? undefined,
    prepTime: (row.prep_time as string | null) ?? undefined,
    cookTime: (row.cook_time as string | null) ?? undefined,
    status: row.status as RecipeDraft['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapStateRecipe(recipe: RecipeRow): RecipeRecord {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    heroImageUri: recipe.heroImageUri,
    sourceUrl: recipe.sourceUrl,
    sourceType: recipe.sourceType,
    sourcePhotoUris: recipe.sourcePhotoUris,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    servings: recipe.servings,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    status: recipe.status,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };
}

function mapRecipeDraftForInsert(householdId: string, draft: RecipeDraft) {
  return {
    household_id: householdId,
    title: draft.title,
    description: draft.description ?? null,
    hero_image_url: draft.heroImageUri ?? null,
    source_url: draft.sourceUrl ?? null,
    source_type: draft.sourceType,
    source_photo_uris: draft.sourcePhotoUris,
    ingredients: draft.ingredients,
    instructions: draft.instructions,
    servings: draft.servings ?? null,
    prep_time: draft.prepTime ?? null,
    cook_time: draft.cookTime ?? null,
    status: draft.status,
  };
}

function mapRecipeDraftForUpdate(draft: RecipeDraft) {
  return {
    title: draft.title,
    description: draft.description ?? null,
    hero_image_url: draft.heroImageUri ?? null,
    source_url: draft.sourceUrl ?? null,
    source_type: draft.sourceType,
    source_photo_uris: draft.sourcePhotoUris,
    ingredients: draft.ingredients,
    instructions: draft.instructions,
    servings: draft.servings ?? null,
    prep_time: draft.prepTime ?? null,
    cook_time: draft.cookTime ?? null,
    status: draft.status,
    updated_at: new Date().toISOString(),
  };
}
