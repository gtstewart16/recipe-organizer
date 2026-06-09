import type { RecipeDraft } from '../../store/recipe-book';

export type SharedImportSourceKind = 'url' | 'text';
export type SharedImportStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'unsupported'
  | 'duplicate';

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
  recipeId?: string;
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
    recipeId: undefined,
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
    recipeId: undefined,
    errorMessage: undefined,
    updatedAt,
  };
}

export function markSharedImportDuplicate(
  record: PendingSharedImport,
  input: { recipeId: string; title: string },
  updatedAt = new Date().toISOString()
): PendingSharedImport {
  return {
    ...record,
    status: 'duplicate',
    draft: {
      title: input.title,
      sourceType: 'url',
      sourceUrl: 'url' in record.payload ? record.payload.url : undefined,
      sourcePhotoUris: [],
      ingredients: [],
      instructions: [],
      status: 'ready',
    },
    recipeId: input.recipeId,
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
