import type { PendingSharedImport } from './types';

export type SharedImportStore = {
  list(): Promise<PendingSharedImport[]>;
  save(record: PendingSharedImport): Promise<void>;
  saveMany(records: PendingSharedImport[]): Promise<void>;
  remove(id: string): Promise<void>;
};
