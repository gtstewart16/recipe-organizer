const DEFAULT_IMPORT_ERROR = 'We could not process that import right now.';

export function formatRecipeImportError(error: unknown, fallbackMessage = DEFAULT_IMPORT_ERROR) {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (isOpenAIRateLimitError(message)) {
    const retrySeconds = parseRetrySeconds(message);

    if (retrySeconds) {
      return `Kitchen Shelf hit the recipe parser rate limit. Please wait about ${retrySeconds} seconds, then tap Try again.`;
    }

    return 'Kitchen Shelf hit the recipe parser rate limit. Please wait about a minute, then tap Try again.';
  }

  if (/OpenAI normalization failed/i.test(message)) {
    return 'Kitchen Shelf could not finish parsing this recipe right now. Please tap Try again in a minute.';
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
