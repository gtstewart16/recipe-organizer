import type { RecipeSourceType } from '../store/recipe-book';

export type ImportFeedbackSourceType = Extract<RecipeSourceType, 'url' | 'photo'>;

export function getImportSourceLabel(sourceType: ImportFeedbackSourceType): string {
  return sourceType === 'url' ? 'recipe link' : 'cookbook photo';
}

export function getImportRetryLabel(sourceType: ImportFeedbackSourceType): string {
  return sourceType === 'url' ? 'Try another link' : 'Try another photo';
}

export function getImportFallbackGuidance(sourceType: ImportFeedbackSourceType): string[] {
  if (sourceType === 'url') {
    return [
      'Try a page that shows the full ingredient list and directions.',
      'If the site hides the recipe behind scripts or a paywall, continue with manual review.',
    ];
  }

  return [
    'Use a clearer, better-lit photo of the cookbook page.',
    'If the page is crowded, import the draft anyway and fill in any missing lines manually.',
  ];
}

export function getImportFeedbackTitle(sourceType: ImportFeedbackSourceType): string {
  return sourceType === 'url' ? 'Recipe link import needs attention' : 'Cookbook photo import needs attention';
}
