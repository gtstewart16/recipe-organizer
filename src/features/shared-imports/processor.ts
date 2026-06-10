import { importRecipeFromSharedText } from '../../services/shared-text-import';
import { importRecipeFromUrl } from '../../services/url-import';
import { markSharedImportFailed, markSharedImportReady, PendingSharedImport } from './types';

type SharedImportProcessorDeps = {
  importFromUrl?: typeof importRecipeFromUrl;
  importFromText?: typeof importRecipeFromSharedText;
};

export async function processPendingSharedImport(
  record: PendingSharedImport,
  deps: SharedImportProcessorDeps = {}
): Promise<PendingSharedImport> {
  const importFromUrl = deps.importFromUrl ?? importRecipeFromUrl;
  const importFromText = deps.importFromText ?? importRecipeFromSharedText;

  try {
    const draft =
      record.sourceKind === 'url' && 'url' in record.payload
        ? await importFromUrl(record.payload.url)
        : 'text' in record.payload
          ? await importFromText(record.payload.text)
          : undefined;

    if (!draft) {
      return markSharedImportFailed(record, 'This shared item is missing recipe content.', 'unsupported');
    }

    return markSharedImportReady(record, draft);
  } catch (error) {
    const message = formatSharedImportError(error);
    const status = /does not appear to contain a recipe/i.test(message) ? 'unsupported' : 'failed';

    return markSharedImportFailed(record, message, status);
  }
}

function formatSharedImportError(error: unknown) {
  const message = error instanceof Error ? error.message : 'We could not process that shared import.';

  if (isOpenAIRateLimitError(message)) {
    const retrySeconds = parseRetrySeconds(message);

    if (retrySeconds) {
      return `Kitchen Shelf hit the recipe parser rate limit. Please wait about ${retrySeconds} seconds, then tap Retry.`;
    }

    return 'Kitchen Shelf hit the recipe parser rate limit. Please wait about a minute, then tap Retry.';
  }

  if (/OpenAI normalization failed/i.test(message)) {
    return 'Kitchen Shelf could not finish parsing this recipe right now. Please tap Retry in a minute.';
  }

  return message;
}

function isOpenAIRateLimitError(message: string) {
  return /rate[_ -]?limit|tokens per min|Please try again in/i.test(message);
}

function parseRetrySeconds(message: string) {
  const match = message.match(/try again in ([\d.]+)s/i);

  if (!match?.[1]) {
    return undefined;
  }

  const seconds = Number(match[1]);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }

  return Math.ceil(seconds);
}
