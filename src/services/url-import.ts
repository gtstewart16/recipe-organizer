import { createRecipeBookDraftFromUrl, RecipeDraft } from '../store/recipe-book';
import { env, hasRemoteImportFunction } from '../lib/env';
import { formatRecipeDuration } from '../lib/duration';

type Fetcher = typeof fetch;

type RecipeNormalizationInput = {
  sourceType: 'url';
  sourceUrl: string;
  rawText: string;
  pageTitle?: string;
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
  fetcher?: Fetcher;
  normalizer?: (input: RecipeNormalizationInput) => Promise<RecipeNormalizationOutput | null>;
};

type JsonLdNode = Record<string, unknown>;

const MAX_REMOTE_NORMALIZATION_TEXT_CHARS = 12000;

export async function importRecipeFromUrl(
  sourceUrl: string,
  options: ImportOptions = {}
): Promise<RecipeDraft> {
  if (!isWebUrl(sourceUrl)) {
    throw new Error('Paste a web recipe link that starts with http:// or https://.');
  }

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(sourceUrl);

  if (!response.ok) {
    return createRecipeBookDraftFromUrl(sourceUrl);
  }

  const html = await response.text();
  const rawText = extractImportableText(sourceUrl, html);
  const pageTitle = getMetaContent(html, 'property', 'og:title') ?? getMetaContent(html, 'name', 'title');
  const normalizer = options.normalizer ?? (hasRemoteImportFunction() ? normalizeRecipeWithRemoteFunction : undefined);
  const recipeNode = extractRecipeNode(html);

  if (recipeNode && !isInstagramUrl(sourceUrl)) {
    return buildDraftFromRecipeNode(sourceUrl, recipeNode);
  }

  if (normalizer) {
    const normalized = await normalizer({
      sourceType: 'url',
      sourceUrl,
      rawText: limitRemoteNormalizationText(rawText),
      pageTitle,
    });

    if (normalized?.isRecipe === false) {
      throw new Error(normalized.error ?? 'This link does not appear to contain a recipe.');
    }

    if (normalized?.title && normalized.ingredients?.length && normalized.instructions?.length) {
      return {
        ...createRecipeBookDraftFromUrl(sourceUrl),
        title: normalized.title,
        description: normalized.description,
        ingredients: normalized.ingredients,
        instructions: normalized.instructions,
        servings: normalized.servings,
        prepTime: formatRecipeDuration(normalized.prepTime),
        cookTime: formatRecipeDuration(normalized.cookTime),
      };
    }
  }

  const instagramDraft = tryBuildInstagramDraft(sourceUrl, html);

  if (instagramDraft) {
    return instagramDraft;
  }

  if (!recipeNode) {
    return createRecipeBookDraftFromUrl(sourceUrl);
  }

  return buildDraftFromRecipeNode(sourceUrl, recipeNode);
}

function buildDraftFromRecipeNode(sourceUrl: string, recipeNode: JsonLdNode): RecipeDraft {
  const baseDraft = createRecipeBookDraftFromUrl(sourceUrl);

  return {
    ...baseDraft,
    title: getString(recipeNode.name) || getString(recipeNode.headline) || baseDraft.title,
    heroImageUri: getImageUrl(recipeNode.image),
    ingredients: getIngredients(recipeNode.recipeIngredient),
    instructions: getInstructions(recipeNode.recipeInstructions),
    servings: getString(recipeNode.recipeYield),
    prepTime: getDurationLabel(recipeNode.prepTime),
    cookTime: getDurationLabel(recipeNode.cookTime),
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
    let errorMessage = 'We could not import that recipe link right now.';

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

function isWebUrl(sourceUrl: string) {
  try {
    const parsedUrl = new URL(sourceUrl);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

function tryBuildInstagramDraft(sourceUrl: string, html: string): RecipeDraft | null {
  if (!isInstagramUrl(sourceUrl)) {
    return null;
  }

  const baseDraft = createRecipeBookDraftFromUrl(sourceUrl);
  const metaTitle = getMetaContent(html, 'property', 'og:title') ?? getMetaContent(html, 'name', 'title');
  const metaDescription =
    getMetaContent(html, 'property', 'og:description') ?? getMetaContent(html, 'name', 'description');
  const metaImage = getMetaContent(html, 'property', 'og:image');
  const captionText = extractInstagramCaption(html) ?? metaDescription ?? '';

  const parsedDescription = parseInstagramDescription(captionText);
  const title = parsedDescription.title ?? extractInstagramTitle(metaTitle) ?? baseDraft.title;

  return {
    ...baseDraft,
    title,
    description: parsedDescription.description,
    heroImageUri: metaImage,
    ingredients: parsedDescription.ingredients.length > 0 ? parsedDescription.ingredients : baseDraft.ingredients,
    instructions: parsedDescription.instructions.length > 0 ? parsedDescription.instructions : baseDraft.instructions,
  };
}

function extractRecipeNode(html: string): JsonLdNode | null {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of matches) {
    const rawJson = decodeHtmlEntities(match[1].trim());

    try {
      const parsed = JSON.parse(rawJson) as unknown;
      const recipeNode = findRecipeNode(parsed);

      if (recipeNode) {
        return recipeNode;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function findRecipeNode(value: unknown): JsonLdNode | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const node = value as JsonLdNode;
  const typeField = node['@type'];

  if (includesRecipeType(typeField)) {
    return node;
  }

  if (Array.isArray(node['@graph'])) {
    return findRecipeNode(node['@graph']);
  }

  return null;
}

function includesRecipeType(typeField: unknown): boolean {
  if (typeof typeField === 'string') {
    return typeField.toLowerCase() === 'recipe';
  }

  if (Array.isArray(typeField)) {
    return typeField.some((item) => typeof item === 'string' && item.toLowerCase() === 'recipe');
  }

  return false;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? stripHtml(value.trim()) : undefined;
}

function getMetaContent(html: string, attribute: 'property' | 'name', key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]*${attribute}=["']${escapedKey}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attribute}=["']${escapedKey}["'][^>]*>`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }

  return undefined;
}

function getImageUrl(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) {
        return item;
      }

      if (item && typeof item === 'object' && typeof (item as { url?: unknown }).url === 'string') {
        return (item as { url: string }).url;
      }
    }
  }

  if (value && typeof value === 'object' && typeof (value as { url?: unknown }).url === 'string') {
    return (value as { url: string }).url;
  }

  return undefined;
}

function getIngredients(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return createRecipeBookDraftFromUrl('https://example.com').ingredients;
  }

  const ingredients = value
    .map((item) => (typeof item === 'string' ? stripHtml(item.trim()) : ''))
    .filter(Boolean);

  return ingredients.length > 0 ? ingredients : createRecipeBookDraftFromUrl('https://example.com').ingredients;
}

function getDurationLabel(value: unknown): string | undefined {
  const raw = getString(value);

  if (!raw) {
    return undefined;
  }

  return formatRecipeDuration(raw);
}

function getInstructions(value: unknown): string[] {
  const fallback = createRecipeBookDraftFromUrl('https://example.com').instructions;

  if (typeof value === 'string' && value.trim()) {
    return [stripHtml(value.trim())];
  }

  if (!Array.isArray(value)) {
    return fallback;
  }

  const instructions = value
    .map((item) => {
      if (typeof item === 'string') {
        return stripHtml(item.trim());
      }

      if (item && typeof item === 'object' && typeof (item as { text?: unknown }).text === 'string') {
        return stripHtml((item as { text: string }).text.trim());
      }

      return '';
    })
    .filter(Boolean);

  return instructions.length > 0 ? instructions : fallback;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function isInstagramUrl(sourceUrl: string): boolean {
  try {
    return new URL(sourceUrl).hostname.includes('instagram.com');
  } catch {
    return false;
  }
}

function extractInstagramTitle(metaTitle?: string): string | undefined {
  if (!metaTitle) {
    return undefined;
  }

  const quotedTitle = metaTitle.match(/"([^"]+)"/);
  if (quotedTitle?.[1]) {
    return normalizeInstagramTitle(quotedTitle[1]);
  }

  return normalizeInstagramTitle(metaTitle.replace(/\s+on Instagram.*$/i, ''));
}

function parseInstagramDescription(description: string): {
  title?: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
} {
  const normalized = sanitizeInstagramDescription(description);
  if (!normalized) {
    return { ingredients: [], instructions: [] };
  }

  const ingredientsMatch = normalized.match(/ingredients:\s*(.+?)(?:method:|instructions:|directions:|steps:|$)/i);
  const instructionsMatch = normalized.match(/(?:method:|instructions:|directions:|steps:)\s*(.+)$/i);
  const fallbackIngredientParts = !ingredientsMatch ? extractHyphenIngredientParts(normalized) : undefined;

  return {
    title: deriveDishTitleFromCaption(normalized),
    description: undefined,
    ingredients: ingredientsMatch
      ? splitRecipeList(ingredientsMatch[1])
      : fallbackIngredientParts
        ? fallbackIngredientParts.ingredients
        : [],
    instructions: instructionsMatch
      ? splitInstructionList(instructionsMatch[1])
      : fallbackIngredientParts?.instructions ?? [],
  };
}

function splitRecipeList(value: string): string[] {
  return value
    .split(/\s*,\s*/)
    .map((item) => stripHtml(item).replace(/\.$/, '').trim())
    .filter(Boolean);
}

function splitInstructionList(value: string): string[] {
  return value
    .split(/\.\s+/)
    .map((item) => stripHtml(item).replace(/\.$/, '').trim())
    .filter(Boolean)
    .map((item) => (item.endsWith('.') ? item : `${item}.`));
}

function normalizeInstagramTitle(value: string): string {
  const clean = decodeHtmlEntities(value)
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ')
    .replace(/[&].*$/g, ' ')
    .replace(/\brecipe below\b/gi, ' ')
    .replace(/\bour favorite\b/gi, ' ')
    .replace(/\bmy favorite\b/gi, ' ')
    .replace(/\bon instagram.*$/i, ' ')
    .replace(/[!?.:,;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const title = clean
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return deriveDishTitleFromCaption(title) ?? title;
}

function sanitizeInstagramDescription(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .replace(/^\d[\d,]* likes,\s*\d[\d,]* comments\s*-\s*[^.]+\.\s*/i, '')
    .trim();
}

function extractHyphenIngredientParts(value: string): { ingredients: string[]; instructions: string[] } | undefined {
  const instructionsIndex = value.search(/(?:method:|instructions:|directions:|steps:)\s*/i);
  const relevant = instructionsIndex >= 0 ? value.slice(0, instructionsIndex) : value;
  const firstBulletIndex = relevant.indexOf(' - ');

  if (firstBulletIndex < 0) {
    return undefined;
  }

  const rawItems = relevant
    .slice(firstBulletIndex + 3)
    .replace(/\*serves[^*]*\*/gi, ' ')
    .replace(/for the sauce:/gi, ' - ')
    .replace(/sriracha mayo for topping:/gi, ' - ')
    .split(/\s+-\s+/)
    .map((item) => stripHtml(item).trim())
    .filter(Boolean);

  const ingredients: string[] = [];
  const instructions: string[] = [];

  for (const item of rawItems) {
    const split = splitIngredientAndInstructionTail(item);

    if (split.ingredient) {
      ingredients.push(split.ingredient);
    }

    instructions.push(...split.instructions);
  }

  return {
    ingredients,
    instructions,
  };
}

function splitIngredientAndInstructionTail(value: string): {
  ingredient?: string;
  instructions: string[];
} {
  const marker = value.search(
    /\b(?:Heat|Cook|Brown|Break|While|Give|Pour|Mix|Allow|Add|Top|Drizzle|Serve|Prep|Slice|Chop)\b/
  );

  if (marker > 0) {
    const ingredient = value.slice(0, marker).replace(/^-+\s*/, '').replace(/[!?.:,;]+$/g, '').trim();
    const instructionTail = value.slice(marker).trim();

    return {
      ingredient: ingredient || undefined,
      instructions: splitInstructionList(instructionTail),
    };
  }

  return {
    ingredient: value.replace(/^-+\s*/, '').replace(/[!?.:,;]+$/g, '').trim() || undefined,
    instructions: [],
  };
}

function extractInstagramCaption(html: string): string | undefined {
  const captionMatch = html.match(/"caption"\s*:\s*"((?:\\.|[^"])*)"/i);

  if (!captionMatch?.[1]) {
    return undefined;
  }

  return decodeJsonString(captionMatch[1]);
}

function extractImportableText(sourceUrl: string, html: string): string {
  if (isInstagramUrl(sourceUrl)) {
    return extractInstagramCaption(html) ?? getMetaContent(html, 'property', 'og:description') ?? '';
  }

  const jsonLdText = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => decodeHtmlEntities(match[1]).trim())
    .join('\n');

  const bodyText = stripHtml(html);

  return [jsonLdText, bodyText].filter(Boolean).join('\n');
}

function limitRemoteNormalizationText(rawText: string): string {
  const normalized = rawText.replace(/\s+/g, ' ').trim();

  if (normalized.length <= MAX_REMOTE_NORMALIZATION_TEXT_CHARS) {
    return normalized;
  }

  const separator = '\n[content truncated for import]\n';
  const segmentLength = Math.floor((MAX_REMOTE_NORMALIZATION_TEXT_CHARS - separator.length) / 2);
  const start = normalized.slice(0, segmentLength).trim();
  const end = normalized.slice(-segmentLength).trim();

  return `${start}${separator}${end}`;
}

function decodeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return value.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }
}

function deriveDishTitleFromCaption(value: string): string | undefined {
  const cleaned = decodeHtmlEntities(value)
    .replace(/\*serves[^*]*\*/gi, ' ')
    .replace(/^\d[\d,]* likes,\s*\d[\d,]* comments\s*-\s*[^.]+\.\s*/i, '')
    .replace(/\brecipe below\b/gi, ' ')
    .replace(/\bour favorite\b/gi, ' ')
    .replace(/\bmy favorite\b/gi, ' ')
    .replace(/[!?.:,;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const dishMatch = cleaned.match(
    /\b([A-Za-z]+(?:\s+[A-Za-z]+){0,4}\s(?:Bowls?|Tacos?|Burgers?|Wraps?|Sandwich(?:es)?|Salad|Pasta|Noodles?|Quesadillas?|Pizza|Soup|Curry|Skillet|Rice|Stir Fry|Meatballs?))\b/i
  );

  if (!dishMatch?.[1]) {
    return undefined;
  }

  return dishMatch[1]
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
