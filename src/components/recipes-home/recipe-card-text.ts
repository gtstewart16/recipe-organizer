const SERVINGS_UNIT_PATTERN = /\b(servings?|people|persons?|portions?)\b/i;

export function formatRecipeServingsLabel(servings: string | undefined): string {
  const trimmedServings = servings?.trim();

  if (!trimmedServings) {
    return 'Review-ready recipe';
  }

  if (SERVINGS_UNIT_PATTERN.test(trimmedServings)) {
    return trimmedServings;
  }

  return `${trimmedServings} servings`;
}

export function getRecipeSnippet(instructions: readonly string[]): string {
  return instructions[0] ?? 'Ready to save into a favorite group.';
}
