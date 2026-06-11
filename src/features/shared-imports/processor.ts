import { importRecipeFromSharedText } from '../../services/shared-text-import';
import { importRecipeFromUrl } from '../../services/url-import';
import { formatRecipeImportError } from '../../services/import-error';
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
    const message = formatRecipeImportError(error, 'We could not process that shared import.');
    const status = /does not appear to contain a recipe/i.test(message) ? 'unsupported' : 'failed';

    return markSharedImportFailed(record, message, status);
  }
}
