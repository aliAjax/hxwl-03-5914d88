import type {
  DrillingRecord,
  BoreholeLayers,
  BoreholeSPTRecords,
  BoreholeSamplingRecords,
  BoreholeWaterLevelRecords,
} from "./types";

export interface ProjectData {
  records: DrillingRecord[];
  boreholeLayers: BoreholeLayers;
  sptRecords: BoreholeSPTRecords;
  samplingRecords: BoreholeSamplingRecords;
  waterLevelRecords: BoreholeWaterLevelRecords;
  initialized: boolean;
  lastSaved: string;
}

const DB_NAME = "hxwl-03-db";
const DB_VERSION = 1;
const STORE_NAME = "project-data";
const DATA_KEY = "main-project";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveProjectData = async (data: Omit<ProjectData, "lastSaved">): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const dataWithTimestamp: ProjectData = {
      ...data,
      lastSaved: new Date().toISOString(),
    };
    const request = store.put(dataWithTimestamp, DATA_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadProjectData = async (): Promise<ProjectData | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(DATA_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ?? null);
    transaction.oncomplete = () => db.close();
  });
};

export const clearProjectData = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error);
  });
};
