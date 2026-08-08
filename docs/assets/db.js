const DB_NAME = 'skc-facturas-web';
const DB_VERSION = 1;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Error de IndexedDB'));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error || new Error('La transacción de IndexedDB fue cancelada.'));
    transaction.onerror = () => reject(transaction.error || new Error('Error en la transacción de IndexedDB.'));
  });
}

export class BrowserDatabase {
  constructor() {
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains('entities')) {
        const store = database.createObjectStore('entities', { keyPath: 'key' });
        store.createIndex('type', 'type');
        store.createIndex('syncStatus', 'syncStatus');
      }

      if (!database.objectStoreNames.contains('files')) {
        const store = database.createObjectStore('files', { keyPath: 'id' });
        store.createIndex('entityKey', 'entityKey');
        store.createIndex('remotePath', 'remotePath');
      }

      if (!database.objectStoreNames.contains('meta')) {
        database.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    this.db = await requestResult(request);
    this.db.onversionchange = () => {
      this.db?.close();
      this.db = null;
    };
    return this.db;
  }

  async putEntity(type, value) {
    const database = await this.open();
    const transaction = database.transaction('entities', 'readwrite');
    transaction.objectStore('entities').put({
      key: `${type}:${value.id}`,
      type,
      syncStatus: value.syncStatus || 'PENDIENTE',
      value: structuredClone(value),
    });
    await transactionDone(transaction);
    return value;
  }

  async getEntity(type, id) {
    const database = await this.open();
    const transaction = database.transaction('entities', 'readonly');
    const row = await requestResult(transaction.objectStore('entities').get(`${type}:${id}`));
    return row ? structuredClone(row.value) : null;
  }

  async getAll(type) {
    const database = await this.open();
    const transaction = database.transaction('entities', 'readonly');
    const rows = await requestResult(transaction.objectStore('entities').index('type').getAll(type));
    return rows.map(row => structuredClone(row.value));
  }

  async getAllEntities() {
    const database = await this.open();
    const transaction = database.transaction('entities', 'readonly');
    const rows = await requestResult(transaction.objectStore('entities').getAll());
    return rows.map(row => ({ type: row.type, value: structuredClone(row.value) }));
  }

  async putFile(file) {
    const database = await this.open();
    const transaction = database.transaction('files', 'readwrite');
    transaction.objectStore('files').put(file);
    await transactionDone(transaction);
  }

  async putFiles(files) {
    if (!files.length) return;
    const database = await this.open();
    const transaction = database.transaction('files', 'readwrite');
    const store = transaction.objectStore('files');
    for (const file of files) store.put(file);
    await transactionDone(transaction);
  }

  async getFile(id) {
    const database = await this.open();
    const transaction = database.transaction('files', 'readonly');
    return requestResult(transaction.objectStore('files').get(id));
  }

  async getAllFiles() {
    const database = await this.open();
    const transaction = database.transaction('files', 'readonly');
    return requestResult(transaction.objectStore('files').getAll());
  }

  async setMeta(key, value) {
    const database = await this.open();
    const transaction = database.transaction('meta', 'readwrite');
    transaction.objectStore('meta').put({ key, value: structuredClone(value) });
    await transactionDone(transaction);
  }

  async getMeta(key, fallback = null) {
    const database = await this.open();
    const transaction = database.transaction('meta', 'readonly');
    const row = await requestResult(transaction.objectStore('meta').get(key));
    return row ? structuredClone(row.value) : fallback;
  }

  async getAllMeta() {
    const database = await this.open();
    const transaction = database.transaction('meta', 'readonly');
    const rows = await requestResult(transaction.objectStore('meta').getAll());
    return Object.fromEntries(rows.map(row => [row.key, structuredClone(row.value)]));
  }

  async clearAll() {
    const database = await this.open();
    const names = ['entities', 'files', 'meta'];
    const transaction = database.transaction(names, 'readwrite');
    for (const name of names) transaction.objectStore(name).clear();
    await transactionDone(transaction);
  }
}

export const db = new BrowserDatabase();
