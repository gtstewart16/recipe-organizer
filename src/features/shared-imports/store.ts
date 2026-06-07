import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PendingSharedImport } from './types';

export type SharedImportStore = {
  list(): Promise<PendingSharedImport[]>;
  save(record: PendingSharedImport): Promise<void>;
  saveMany(records: PendingSharedImport[]): Promise<void>;
  replaceExisting(record: PendingSharedImport): Promise<boolean>;
  remove(id: string): Promise<void>;
};

type SharedImportStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const SHARED_IMPORTS_STORAGE_KEY = 'recipe-organizer-shared-imports-v1';

export function createPersistedSharedImportStore(
  storage: SharedImportStorage = AsyncStorage,
  key = SHARED_IMPORTS_STORAGE_KEY
): SharedImportStore {
  const list = async () => {
    const value = await storage.getItem(key);

    if (!value) {
      return [];
    }

    try {
      return JSON.parse(value) as PendingSharedImport[];
    } catch {
      return [];
    }
  };

  const saveMany = async (records: PendingSharedImport[]) => {
    await storage.setItem(key, JSON.stringify(records));
  };

  return {
    list,
    async save(record) {
      const records = await list();
      const remaining = records.filter((item) => item.id !== record.id);
      await saveMany([record, ...remaining].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
    },
    saveMany,
    async replaceExisting(record) {
      const records = await list();
      let didReplace = false;
      const nextRecords = records.map((item) => {
        if (item.id !== record.id) {
          return item;
        }

        didReplace = true;
        return record;
      });

      if (didReplace) {
        await saveMany(nextRecords.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
      }

      return didReplace;
    },
    async remove(id) {
      const records = await list();
      await saveMany(records.filter((item) => item.id !== id));
    },
  };
}

export const sharedImportStore = createPersistedSharedImportStore();
