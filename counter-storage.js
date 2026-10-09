(() => {
  function open(name = 'orbit-workspace:counters:v3') {
    let ready;
    function database() {
      return ready ||= new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('events', { keyPath: 'id' });
          request.result.createObjectStore('meta', { keyPath: 'key' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => { ready = null; reject(request.error); };
        request.onblocked = () => reject(new Error('Counter storage is blocked.'));
      });
    }
    async function snapshot() {
      const db = await database();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['events', 'meta']), events = tx.objectStore('events').getAll(), totals = tx.objectStore('meta').get('totals');
        tx.oncomplete = () => resolve({ events: events.result, totals: totals.result?.value || {} });
        tx.onabort = tx.onerror = () => reject(tx.error || new Error('Unable to read counter storage.'));
      });
    }
    async function enqueue(event) {
      const db = await database();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('events', 'readwrite');tx.objectStore('events').add(event);
        tx.oncomplete = resolve;tx.onabort = tx.onerror = () => reject(tx.error || new Error('Unable to queue this click.'));
      });
    }
    async function acknowledge(totals, ids) {
      const db = await database();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['events', 'meta'], 'readwrite'), meta = tx.objectStore('meta'), previous = meta.get('totals');
        previous.onsuccess = () => {
          const value = { ...previous.result?.value };
          for (const metric of Object.keys(totals)) value[metric] = Math.max(value[metric] || 0, totals[metric]);
          meta.put({ key: 'totals', value });
          for (const id of ids) tx.objectStore('events').delete(id);
        };
        tx.oncomplete = resolve;tx.onabort = tx.onerror = () => reject(tx.error || new Error('Unable to save counter receipt.'));
      });
    }
    return Object.freeze({ snapshot, enqueue, acknowledge });
  }
  window.OrbitCounterStorage = Object.freeze({ open });
})();
