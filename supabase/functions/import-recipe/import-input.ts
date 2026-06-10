export type ImportRecipeRequest = {
  sourceType: 'url' | 'photo' | 'shared_text';
  sourceUrl?: string;
  sourcePhotoUris?: string[];
  imageDataUrls?: string[];
  rawText?: string;
  pageTitle?: string;
};

export const MAX_REMOTE_NORMALIZATION_TEXT_CHARS = 12000;

export function trimImportRecipeRequestForNormalization(request: ImportRecipeRequest): ImportRecipeRequest {
  if ((request.sourceType === 'url' || request.sourceType === 'shared_text') && request.rawText) {
    return {
      ...request,
      rawText: limitRemoteNormalizationText(request.rawText),
    };
  }

  return request;
}

export function limitRemoteNormalizationText(rawText: string): string {
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
