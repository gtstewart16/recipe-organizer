export const MAX_SERVINGS = 999;

export function parseServings(value?: string): number | null {
  const match = value?.trim().match(/^(?:(?:serves|servings:?)\s*)?(\d+)(?:\s*(?:servings?|people))?$/i);
  const count = match ? Number(match[1]) : 0;
  return Number.isInteger(count) && count >= 1 && count <= MAX_SERVINGS ? count : null;
}

const fractions: Record<string, number> = {
  '¼': 1 / 4, '½': 1 / 2, '¾': 3 / 4,
  '⅐': 1 / 7, '⅑': 1 / 9, '⅒': 1 / 10,
  '⅓': 1 / 3, '⅔': 2 / 3, '⅕': 1 / 5, '⅖': 2 / 5, '⅗': 3 / 5, '⅘': 4 / 5,
  '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
};
const glyphs = Object.keys(fractions).join('');
const quantity = `(?:\\d+[ -]+\\d+\\s*[/⁄]\\s*\\d+|\\d+\\s*[/⁄]\\s*\\d+|\\d*\\s*[${glyphs}]|\\d+(?:\\.\\d+)?|\\.\\d+)`;
const leadingQuantity = new RegExp(`^(\\s*)(${quantity})(?:(\\s*(?:[-–—]|to)\\s*)(${quantity}))?(.*)$`, 'i');
const compoundAmount = new RegExp(`^(.*?)(\\s+(?:plus|and)\\s+)(?=${quantity}\\s*(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|ml|g|kg|oz|lb|pounds?|ounces?|eggs?|yolks?)\\b)(.+)$`, 'i');

function readQuantity(text: string): number {
  const glyph = text.trim().slice(-1);
  if (fractions[glyph] !== undefined) {
    return Number(text.trim().slice(0, -1).trim() || 0) + fractions[glyph];
  }
  const fraction = text.match(/^(?:(\d+)[ -]+)?(\d+)\s*[/⁄]\s*(\d+)$/);
  if (fraction) return Number(fraction[1] ?? 0) + Number(fraction[2]) / Number(fraction[3]);
  return Number(text);
}

function formatQuantity(value: number): string {
  if (value > 0 && value < 0.01) return '<0.01';
  return String(Number(value.toFixed(2)));
}

/** Only the leading amount is scaled; package sizes and preparation text stay intact. */
export function scaleIngredient(ingredient: string, factor: number): string {
  if (factor === 1 || !Number.isFinite(factor) || factor <= 0) return ingredient;
  const compound = ingredient.match(compoundAmount);
  if (compound) {
    return `${scaleIngredient(compound[1], factor)}${compound[2]}${scaleIngredient(compound[3], factor)}`;
  }
  const match = ingredient.match(leadingQuantity);
  if (!match) return ingredient;
  const [, whitespace, first, separator, second, rest] = match;
  // Avoid partially interpreting malformed quantities or dimensions (e.g. 1-inch).
  if (/^\s*[/⁄.,\d–—%"'″′-]/.test(rest)) return ingredient;
  const start = readQuantity(first) * factor;
  const end = second ? readQuantity(second) * factor : null;
  if (!Number.isFinite(start) || (end !== null && !Number.isFinite(end))) return ingredient;
  return `${whitespace}${formatQuantity(start)}${end === null ? '' : `${separator}${formatQuantity(end)}`}${rest}`;
}
