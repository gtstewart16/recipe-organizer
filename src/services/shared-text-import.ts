import { env, hasRemoteImportFunction } from '../lib/env';
import { formatRecipeDuration } from '../lib/duration';
import { createRecipeBookDraftFromSharedText, RecipeDraft } from '../store/recipe-book';

type RecipeNormalizationInput = {
  sourceType: 'shared_text';
  rawText: string;
};

type RecipeNormalizationOutput = {
  isRecipe?: boolean;
  error?: string;
  title?: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  servings?: string;
  prepTime?: string;
  cookTime?: string;
};

type ImportOptions = {
  normalizer?: (input: RecipeNormalizationInput) => Promise<RecipeNormalizationOutput | null>;
};

export async function importRecipeFromSharedText(
  rawText: string,
  options: ImportOptions = {}
): Promise<RecipeDraft> {
  const fallbackDraft = createRecipeBookDraftFromSharedText(rawText);
  const normalizer = options.normalizer ?? (hasRemoteImportFunction() ? normalizeRecipeWithRemoteFunction : undefined);

  if (!normalizer) {
    return fallbackDraft;
  }

  const normalized = await normalizer({ sourceType: 'shared_text', rawText });

  if (normalized?.isRecipe === false) {
    throw new Error(normalized.error ?? 'This share does not appear to contain a recipe.');
  }

  if (!normalized?.title || !normalized.ingredients?.length || !normalized.instructions?.length) {
    return fallbackDraft;
  }

  return {
    ...fallbackDraft,
    title: normalized.title,
    description: normalized.description,
    ingredients: normalized.ingredients,
    instructions: normalized.instructions,
    servings: normalized.servings,
    prepTime: formatRecipeDuration(normalized.prepTime),
    cookTime: formatRecipeDuration(normalized.cookTime),
  };
}

async function normalizeRecipeWithRemoteFunction(
  input: RecipeNormalizationInput
): Promise<RecipeNormalizationOutput | null> {
  if (!env.supabaseAnonKey) {
    return null;
  }

  const response = await fetch(env.supabaseImportFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${env.supabaseAnonKey}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = 'We could not process that shared recipe text right now.';

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        errorMessage = payload.error;
      }
    } catch {
      // Leave the default message in place when the response body is not JSON.
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as RecipeNormalizationOutput;
}
