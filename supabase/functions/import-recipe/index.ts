type ImportRecipeRequest = {
  sourceType: 'url' | 'photo';
  sourceUrl?: string;
  sourcePhotoUris?: string[];
  imageDataUrls?: string[];
  rawText?: string;
  pageTitle?: string;
};

type ImportRecipeResponse = {
  isRecipe: boolean;
  title: string;
  description?: string;
  sourceType: 'url' | 'photo';
  sourceUrl?: string;
  sourcePhotoUris: string[];
  ingredients: string[];
  instructions: string[];
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  status: 'needs_review';
};

type OpenAIRecipe = {
  isRecipe: boolean;
  error?: string | null;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  servings?: string;
  prepTime?: string;
  cookTime?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECIPE_SCHEMA = {
  name: 'recipe_import',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: {
        type: ['string', 'null'],
        description: 'Strictly the dish name only. No creator names, emojis, or phrases like recipe below.',
      },
      isRecipe: {
        type: 'boolean',
        description: 'True only when the source clearly contains a recipe with ingredients and directions.',
      },
      error: {
        type: ['string', 'null'],
        description: 'If isRecipe is false, give a short user-facing reason.',
      },
      description: {
        type: ['string', 'null'],
      },
      servings: {
        type: ['string', 'null'],
      },
      prepTime: {
        type: ['string', 'null'],
      },
      cookTime: {
        type: ['string', 'null'],
      },
      ingredients: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      instructions: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
    required: ['isRecipe', 'error', 'title', 'description', 'servings', 'prepTime', 'cookTime', 'ingredients', 'instructions'],
  },
};

function deriveTitleFromUrl(sourceUrl: string) {
  try {
    const slug = new URL(sourceUrl).pathname.split('/').filter(Boolean).pop();

    if (!slug) {
      return 'Imported Recipe Draft';
    }

    return slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return 'Imported Recipe Draft';
  }
}

function buildFallbackResponse(request: ImportRecipeRequest): ImportRecipeResponse {
  if (request.sourceType === 'url') {
    return {
      isRecipe: true,
      title: deriveTitleFromUrl(request.sourceUrl ?? ''),
      sourceType: 'url',
      sourceUrl: request.sourceUrl,
      sourcePhotoUris: [],
      ingredients: [
        '1 primary ingredient',
        '2 tablespoons olive oil',
        'Salt and pepper to taste',
      ],
      instructions: [
        'Review the imported content and confirm the title.',
        'Paste or refine the ingredient list from the original source.',
        'Finalize the directions before saving the recipe.',
      ],
      status: 'needs_review',
    };
  }

  return {
    isRecipe: true,
    title: 'Cookbook Recipe Draft',
    sourceType: 'photo',
    sourcePhotoUris: request.sourcePhotoUris ?? [],
    ingredients: [
      '1 main ingredient from the scanned page',
      'Any seasonings or pantry items from the recipe',
    ],
    instructions: [
      'Use OCR or vision extraction to transcribe the cookbook page.',
      'Split the recipe into ingredients and numbered directions.',
      'Return the draft for human review before saving.',
    ],
    status: 'needs_review',
  };
}

async function normalizeRecipeWithOpenAI(request: ImportRecipeRequest): Promise<OpenAIRecipe | null> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1-mini';

  if (!apiKey) {
    return null;
  }

  const prompt =
    request.sourceType === 'photo'
      ? [
          'You extract recipe data from cookbook photos and return clean structured recipe data.',
          'Rules:',
          '- If this is not actually a recipe page, set isRecipe to false, provide a short error message, and leave title null with empty ingredients and instructions arrays.',
          '- Read the recipe title from the page and return only the dish name.',
          '- Put only ingredient lines in ingredients.',
          '- Put only preparation or cooking steps in instructions.',
          '- Preserve servings when it appears on the page.',
          '- Preserve prep time and cook time when they appear on the page.',
          '- If the page includes grouped ingredients, keep each ingredient as its own line.',
          '- Ignore nutrition, storage notes, page numbers, and unrelated cookbook metadata.',
          '- If description is not useful, return null for description.',
          '',
          'These images are cookbook pages for a single recipe. Extract the recipe accurately.',
        ].join('\n')
      : [
          'You convert scraped social and web recipe text into clean structured recipe data.',
          'Rules:',
          '- If the source does not clearly contain a recipe, set isRecipe to false, provide a short error message, and leave title null with empty ingredients and instructions arrays.',
          '- Output only the dish name in the title field.',
          '- Remove creator names, emojis, engagement text, and phrases like "recipe below".',
          '- Put only ingredient lines in ingredients.',
          '- Put only cooking/preparation steps in instructions.',
          '- If ingredients are grouped (such as sauce or topping), keep each ingredient as its own line.',
          '- If servings appear, preserve them in the servings field.',
          '- If prep or cook time appear, preserve them in prepTime and cookTime.',
          '- If description is not useful, return null for description.',
          '',
          `Source URL: ${request.sourceUrl ?? ''}`,
          `Page title: ${request.pageTitle ?? ''}`,
          '',
          'Raw extracted text:',
          request.rawText ?? '',
        ].join('\n');

  if (request.sourceType === 'url' && !request.rawText?.trim()) {
    return null;
  }

  if (request.sourceType === 'photo' && (!request.imageDataUrls || request.imageDataUrls.length === 0)) {
    return null;
  }

  const userContent =
    request.sourceType === 'photo'
      ? [
          { type: 'text', text: prompt },
          ...(request.imageDataUrls ?? []).map((url) => ({
            type: 'image_url',
            image_url: {
              url,
            },
          })),
        ]
      : prompt;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'Return a recipe object that follows the supplied JSON schema exactly.',
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: RECIPE_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI normalization failed: ${errorText}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;

  if (!content) {
    return null;
  }

  return JSON.parse(content) as OpenAIRecipe;
}

function buildResponse(request: ImportRecipeRequest, normalized: OpenAIRecipe): ImportRecipeResponse {
  return {
    isRecipe: true,
    title: normalized.title,
    description: normalized.description ?? undefined,
    sourceType: request.sourceType,
    sourceUrl: request.sourceUrl,
    sourcePhotoUris: request.sourcePhotoUris ?? [],
    ingredients: normalized.ingredients,
    instructions: normalized.instructions,
    servings: normalized.servings ?? undefined,
    prepTime: normalized.prepTime ?? undefined,
    cookTime: normalized.cookTime ?? undefined,
    status: 'needs_review',
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await request.json()) as ImportRecipeRequest;
    const normalized = await normalizeRecipeWithOpenAI(body);
    if (normalized && normalized.isRecipe === false) {
      return Response.json(
        {
          error: normalized.error ?? 'This content does not appear to contain a recipe.',
        },
        {
          status: 422,
          headers: corsHeaders,
        }
      );
    }

    const response = normalized ? buildResponse(body, normalized) : buildFallbackResponse(body);

    return Response.json(response, {
      headers: corsHeaders,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown import failure',
      },
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  }
});
