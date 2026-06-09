import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PendingSharedImport } from './types';

export type SharedImportStore = {
  list(): Promise<PendingSharedImport[]>;
  enqueue(record: PendingSharedImport): Promise<PendingSharedImport>;
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
  let writeQueue = Promise.resolve();

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

  const sortRecords = (records: PendingSharedImport[]) =>
    [...records].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  const withWriteLock = async <Value,>(operation: () => Promise<Value>) => {
    const nextOperation = writeQueue.then(operation, operation);
    writeQueue = nextOperation.then(
      () => undefined,
      () => undefined
    );
    return nextOperation;
  };

  return {
    list,
    async enqueue(record) {
      return withWriteLock(async () => {
        const records = await list();
        const duplicate = records.find((item) => payloadFingerprint(item) === payloadFingerprint(record));

        if (duplicate) {
          return duplicate;
        }

        await saveMany(sortRecords([record, ...records]));
        return record;
      });
    },
    async save(record) {
      await withWriteLock(async () => {
        const records = await list();
        const remaining = records.filter((item) => item.id !== record.id);
        await saveMany(sortRecords([record, ...remaining]));
      });
    },
    saveMany,
    async replaceExisting(record) {
      return withWriteLock(async () => {
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
          await saveMany(sortRecords(nextRecords));
        }

        return didReplace;
      });
    },
    async remove(id) {
      await withWriteLock(async () => {
        const records = await list();
        await saveMany(records.filter((item) => item.id !== id));
      });
    },
  };
}

export const sharedImportStore = createPersistedSharedImportStore();

function payloadFingerprint(record: PendingSharedImport) {
  if ('url' in record.payload) {
    return `url:${record.payload.url.trim().replace(/\/+$/, '')}`;
  }

  return `text:${record.payload.text.replace(/\s+/g, ' ').trim()}`;
}
