export type RecipeSourceType = 'url' | 'photo' | 'manual';
export type RecipeStatus = 'needs_review' | 'ready' | 'failed';

export type RecipeDraft = {
  title: string;
  description?: string;
  heroImageUri?: string;
  sourceUrl?: string;
  sourceType: RecipeSourceType;
  sourcePhotoUris: string[];
  ingredients: string[];
  instructions: string[];
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  status: RecipeStatus;
};

export type RecipeRecord = RecipeDraft & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type RecipeGroup = {
  id: string;
  name: string;
  isFavorite?: boolean;
};

export type RecipeGroupMembership = {
  recipeId: string;
  groupId: string;
};

export type RecipeBookState = {
  recipes: RecipeRecord[];
  groups: RecipeGroup[];
  memberships: RecipeGroupMembership[];
};

export type RecipeBookAction =
  | { type: 'state/hydrated'; payload: RecipeBookState }
  | { type: 'group/created'; payload: RecipeGroup }
  | { type: 'group/renamed'; payload: RecipeGroup }
  | { type: 'group/favoriteToggled'; payload: { id: string; isFavorite: boolean } }
  | { type: 'group/deleted'; payload: { id: string } }
  | {
      type: 'recipe/imported';
      payload: {
        draft: RecipeDraft;
        groupIds: string[];
      };
    }
  | {
      type: 'recipe/updated';
      payload: {
        recipeId: string;
        draft: RecipeDraft;
        groupIds: string[];
      };
    }
  | {
      type: 'recipe/deleted';
      payload: {
        recipeId: string;
      };
    };

const DEFAULT_INGREDIENTS = [
  '1 protein or main ingredient',
  '2 tablespoons olive oil',
  'Kosher salt and black pepper to taste',
];

const DEFAULT_INSTRUCTIONS = [
  'Review the imported recipe and update the title, ingredients, and servings as needed.',
  'Finish adding the directions from the original source or cookbook page.',
  'Save the recipe into one or more groups for easy browsing later.',
];

export function createEmptyRecipeBookState(): RecipeBookState {
  return {
    recipes: [],
    groups: [],
    memberships: [],
  };
}

export function createRecipeBookDraftFromUrl(sourceUrl: string): RecipeDraft {
  const fallbackTitle = deriveTitleFromUrl(sourceUrl);

  return {
    title: fallbackTitle,
    sourceUrl,
    sourceType: 'url',
    sourcePhotoUris: [],
    ingredients: DEFAULT_INGREDIENTS,
    instructions: DEFAULT_INSTRUCTIONS,
    prepTime: undefined,
    cookTime: undefined,
    status: 'needs_review',
  };
}

export function createRecipeBookDraftFromPhoto(sourcePhotoUris: string[]): RecipeDraft {
  return {
    title: 'Cookbook Recipe Draft',
    heroImageUri: sourcePhotoUris[0],
    sourceType: 'photo',
    sourcePhotoUris,
    ingredients: DEFAULT_INGREDIENTS,
    instructions: DEFAULT_INSTRUCTIONS,
    prepTime: undefined,
    cookTime: undefined,
    status: 'needs_review',
  };
}

export function recipeBookReducer(
  state: RecipeBookState,
  action: RecipeBookAction
): RecipeBookState {
  switch (action.type) {
    case 'state/hydrated':
      return {
        ...action.payload,
        groups: action.payload.groups.map(normalizeRecipeGroup),
      };
    case 'group/created':
      return {
        ...state,
        groups: state.groups.some((group) => group.id === action.payload.id)
          ? state.groups
          : [...state.groups, normalizeRecipeGroup(action.payload)],
      };
    case 'group/renamed':
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === action.payload.id
            ? normalizeRecipeGroup({
                ...group,
                name: action.payload.name,
              })
            : normalizeRecipeGroup(group)
        ),
      };
    case 'group/favoriteToggled':
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === action.payload.id
            ? {
                ...group,
                isFavorite: action.payload.isFavorite,
              }
            : normalizeRecipeGroup(group)
        ),
      };
    case 'group/deleted':
      return {
        ...state,
        groups: state.groups.filter((group) => group.id !== action.payload.id),
        memberships: state.memberships.filter(
          (membership) => membership.groupId !== action.payload.id
        ),
      };
    case 'recipe/imported': {
      const recipeId = `recipe-${state.recipes.length + 1}`;
      const now = new Date().toISOString();
      const recipe: RecipeRecord = {
        ...action.payload.draft,
        id: recipeId,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...state,
        recipes: [recipe, ...state.recipes],
        memberships: [
          ...state.memberships,
          ...action.payload.groupIds.map((groupId) => ({
            groupId,
            recipeId,
          })),
        ],
      };
    }
    case 'recipe/updated':
      return {
        ...state,
        recipes: state.recipes.map((recipe) =>
          recipe.id === action.payload.recipeId
            ? {
                ...recipe,
                ...action.payload.draft,
                updatedAt: new Date().toISOString(),
              }
            : recipe
        ),
        memberships: [
          ...state.memberships.filter((membership) => membership.recipeId !== action.payload.recipeId),
          ...action.payload.groupIds.map((groupId) => ({
            groupId,
            recipeId: action.payload.recipeId,
          })),
        ],
      };
    case 'recipe/deleted':
      return {
        ...state,
        recipes: state.recipes.filter((recipe) => recipe.id !== action.payload.recipeId),
        memberships: state.memberships.filter((membership) => membership.recipeId !== action.payload.recipeId),
      };
    default:
      return state;
  }
}

export function selectFilteredRecipes(state: RecipeBookState, query: string): RecipeRecord[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return state.recipes;
  }

  return state.recipes.filter((recipe) => {
    const matchingGroups = state.memberships
      .filter((membership) => membership.recipeId === recipe.id)
      .map((membership) => state.groups.find((group) => group.id === membership.groupId)?.name ?? '');

    return [recipe.title, ...matchingGroups].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    );
  });
}

function deriveTitleFromUrl(sourceUrl: string): string {
  try {
    const pathname = new URL(sourceUrl).pathname
      .split('/')
      .filter(Boolean)
      .pop();

    if (!pathname) {
      return 'Imported Recipe Draft';
    }

    return pathname
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return 'Imported Recipe Draft';
  }
}

function normalizeRecipeGroup(group: RecipeGroup): RecipeGroup {
  return {
    ...group,
    isFavorite: group.isFavorite ?? false,
  };
}
