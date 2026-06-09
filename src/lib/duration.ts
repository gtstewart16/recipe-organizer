export function formatRecipeDuration(value: string | undefined): string | undefined {
  const raw = value?.trim();

  if (!raw) {
    return undefined;
  }

  return formatIsoDuration(raw) ?? raw;
}

function formatIsoDuration(value: string): string | undefined {
  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/i);

  if (!match) {
    return undefined;
  }

  const [, daysRaw, hoursRaw, minutesRaw] = match;
  const days = daysRaw ? Number(daysRaw) : 0;
  const hours = hoursRaw ? Number(hoursRaw) : 0;
  const minutes = minutesRaw ? Number(minutesRaw) : 0;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} day${days === 1 ? '' : 's'}`);
  }

  if (hours > 0) {
    parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} min${minutes === 1 ? '' : 's'}`);
  }

  return parts.length > 0 ? parts.join(' ') : undefined;
}
