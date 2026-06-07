import type { RecipeDraft } from '../../store/recipe-book';

export type SharedImportSourceKind = 'url' | 'text';
export type SharedImportStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'unsupported';

export type SharedImportPayload = { url: string } | { text: string };

export type PendingSharedImport = {
  id: string;
  status: SharedImportStatus;
  sourceKind: SharedImportSourceKind;
  sourceLabel?: string;
  payload: SharedImportPayload;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
  draft?: RecipeDraft;
};

export function createPendingSharedImport(input: {
  id: string;
  sourceKind: SharedImportSourceKind;
  sourceLabel?: string;
  payload: SharedImportPayload;
  createdAt?: string;
}): PendingSharedImport {
  const timestamp = input.createdAt ?? new Date().toISOString();

  return {
    id: input.id,
    status: 'pending',
    sourceKind: input.sourceKind,
    sourceLabel: input.sourceLabel,
    payload: input.payload,
    createdAt: timestamp,
    updatedAt: timestamp,
    errorMessage: undefined,
    draft: undefined,
  };
}

export function markSharedImportReady(
  record: PendingSharedImport,
  draft: RecipeDraft,
  updatedAt = new Date().toISOString()
): PendingSharedImport {
  return {
    ...record,
    status: 'ready',
    draft,
    errorMessage: undefined,
    updatedAt,
  };
}

export function markSharedImportFailed(
  record: PendingSharedImport,
  errorMessage: string,
  status: Extract<SharedImportStatus, 'failed' | 'unsupported'> = 'failed',
  updatedAt = new Date().toISOString()
): PendingSharedImport {
  return {
    ...record,
    status,
    errorMessage,
    updatedAt,
  };
}
