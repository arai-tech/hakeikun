import { openDB, IDBPDatabase } from 'idb';
import { Signal } from '../types';

const DB_NAME = 'wave-kun-db';
const STORE_NAME = 'signals-store';
const DB_VERSION = 1;

export const dbService = {
  async getDB(): Promise<IDBPDatabase> {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // We'll store the entire signals array as a single entry for simplicity, 
          // or we could store each signal. Let's store the whole config to keep it simple.
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  },

  async saveSignals(signals: (Signal | {})[]): Promise<void> {
    const db = await this.getDB();
    await db.put(STORE_NAME, signals, 'current-signals');
  },

  async loadSignals(): Promise<(Signal | {})[] | null> {
    const db = await this.getDB();
    return db.get(STORE_NAME, 'current-signals');
  },

  async requestPersistentStorage(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persisted: ${isPersisted}`);
      return isPersisted;
    }
    return false;
  }
};
