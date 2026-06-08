import { env, hasRemoteImportFunction } from '../lib/env';
import { formatRecipeDuration } from '../lib/duration';
import { createRecipeBookDraftFromPhoto, RecipeDraft } from '../store/recipe-book';

type PhotoAssetInput = {
  uri: string;
  mimeType?: string;
  base64?: string | null;
};

type RecipeNormalizationInput = {
  sourceType: 'photo';
  sourcePhotoUris: string[];
  imageDataUrls: string[];
};

type RecipeNormalizationOutput = {
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

export async function importRecipeFromPhoto(
  assets: PhotoAssetInput[],
  options: ImportOptions = {}
): Promise<RecipeDraft> {
  const sourcePhotoUris = assets.map((asset) => asset.uri);
  const fallbackDraft = createRecipeBookDraftFromPhoto(sourcePhotoUris);
  const normalizer = options.normalizer ?? (hasRemoteImportFunction() ? normalizeRecipeWithRemoteFunction : undefined);

  if (!normalizer) {
    return fallbackDraft;
  }

  const imageDataUrls = assets
    .filter((asset) => asset.base64)
    .map((asset) => `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);

  if (imageDataUrls.length === 0) {
    return fallbackDraft;
  }

  const normalized = await normalizer({
    sourceType: 'photo',
    sourcePhotoUris,
    imageDataUrls,
  });

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
    return null;
  }

  return (await response.json()) as RecipeNormalizationOutput;
}
