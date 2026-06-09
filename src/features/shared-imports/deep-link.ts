import { createPendingSharedImport, type PendingSharedImport, type SharedImportPayload } from './types';

type ParsedSharedImportDeepLink = {
  sourceKind: 'url' | 'text';
  sourceLabel?: string;
  payload: SharedImportPayload;
};

type SharedImportDeepLinkDeps = {
  createId?: () => string;
  now?: () => string;
};

const SUPPORTED_SCHEME = 'kitchenshelf:';
const EXPO_DEV_SCHEMES = new Set(['exp:', 'exps:']);
const SUPPORTED_ROUTES = new Set(['share', 'import']);

export function parseSharedImportDeepLink(value: string): ParsedSharedImportDeepLink | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    return null;
  }

  if (!isSupportedSharedImportUrl(parsedUrl)) {
    return null;
  }

  const sharedUrl = getTrimmedParam(parsedUrl, 'url');
  if (sharedUrl && isAbsoluteHttpUrl(sharedUrl)) {
    return {
      sourceKind: 'url',
      sourceLabel: formatUrlSourceLabel(sharedUrl),
      payload: { url: sharedUrl },
    };
  }

  const text = getTrimmedParam(parsedUrl, 'text') ?? getTrimmedParam(parsedUrl, 'payload');
  if (!text) {
    return null;
  }

  if (isAbsoluteHttpUrl(text)) {
    return {
      sourceKind: 'url',
      sourceLabel: formatUrlSourceLabel(text),
      payload: { url: text },
    };
  }

  return {
    sourceKind: 'text',
    sourceLabel: 'Shared text',
    payload: { text },
  };
}

export function createSharedImportFromDeepLink(
  value: string,
  deps: SharedImportDeepLinkDeps = {}
): PendingSharedImport | null {
  const parsed = parseSharedImportDeepLink(value);

  if (!parsed) {
    return null;
  }

  return createPendingSharedImport({
    id: deps.createId?.() ?? createSharedImportId(),
    sourceKind: parsed.sourceKind,
    sourceLabel: parsed.sourceLabel,
    payload: parsed.payload,
    createdAt: deps.now?.(),
  });
}

function isSupportedSharedImportUrl(parsedUrl: URL) {
  if (parsedUrl.protocol === SUPPORTED_SCHEME) {
    return isSupportedCustomSchemeRoute(parsedUrl);
  }

  if (EXPO_DEV_SCHEMES.has(parsedUrl.protocol)) {
    return isSupportedExpoRoute(parsedUrl);
  }

  return false;
}

function isSupportedCustomSchemeRoute(parsedUrl: URL) {
  const hostRoute = parsedUrl.hostname.toLowerCase();
  const pathRoute = parsedUrl.pathname.replace(/^\/+/, '').split('/')[0]?.toLowerCase();

  return SUPPORTED_ROUTES.has(hostRoute) || SUPPORTED_ROUTES.has(pathRoute);
}

function isSupportedExpoRoute(parsedUrl: URL) {
  const routeParts = parsedUrl.pathname.split('/').filter(Boolean);
  const markerIndex = routeParts.indexOf('--');
  const appRoute = markerIndex >= 0 ? routeParts[markerIndex + 1]?.toLowerCase() : undefined;

  return Boolean(appRoute && SUPPORTED_ROUTES.has(appRoute));
}

function getTrimmedParam(parsedUrl: URL, name: string) {
  const value = parsedUrl.searchParams.get(name)?.trim();
  return value ? value : null;
}

function isAbsoluteHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatUrlSourceLabel(value: string) {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, '');
    return hostname || undefined;
  } catch {
    return undefined;
  }
}

function createSharedImportId() {
  return `share-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
