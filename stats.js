(() => {
  const minimums = { likes: 380, downloads: 178, visits: 1155 };
  const nodes = { likes: document.getElementById('like-count'), downloads: document.getElementById('download-count'), visits: document.getElementById('visit-count') };
  const likeButton = document.getElementById('like-orbit'), feedback = document.getElementById('like-feedback');
  const format = new Intl.NumberFormat('en-US'), config = window.OrbitCounterConfig;
  const production = location.hostname === 'baiming-zhang.github.io' && /^\/Orbit-Workspace\/(?:index\.html)?$/.test(location.pathname);
  const preview = config?.preview === true && ['localhost', '127.0.0.1'].includes(location.hostname);
  const live = production || preview;
  let legacy = {};try { legacy = JSON.parse(localStorage.getItem('orbit-workspace:public-stats:v2') || '{}'); } catch {}
  for (const metric of Object.keys(minimums)) {
    const value = legacy[metric];legacy[metric] = Number.isSafeInteger(value) && value >= minimums[metric] && value <= 1e9 ? value : minimums[metric];
    nodes[metric].textContent = format.format(legacy[metric]);
  }
  const store = window.OrbitCounterStorage.open(config?.databaseName);
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('orbit-workspace:counters:v3') : null;
  let sending = false, retryTimer, failures = 0, paintRevision = 0, storageFailure = false;
  function message(key) { feedback.dataset.i18n = key;window.OrbitI18n.apply();feedback.hidden = !key; }
  async function paint() {
    const revision = ++paintRevision, snapshot = await store.snapshot();if (revision !== paintRevision) return;
    for (const metric of Object.keys(nodes)) {
      const pending = snapshot.events.filter(event => event.metric === metric).length;
      nodes[metric].textContent = format.format(Math.max(legacy[metric], snapshot.totals[metric] || 0) + pending);
      nodes[metric].dataset.source = pending ? 'pending' : snapshot.totals[metric] ? 'shared' : 'cached';
      nodes[metric].dataset.pending = String(pending);
    }
    if (!storageFailure) feedback.hidden = true;
    nodes.downloads.dataset.i18nTitle = snapshot.events.some(event => event.metric === 'downloads') ? 'downloadQueued' : 'downloadsLive';
    window.OrbitI18n.apply();
  }
  function schedule(delay) { clearTimeout(retryTimer);retryTimer = setTimeout(() => sync(), delay); }
  function validateReceipt(data, events) {
    if (data?.saved !== true || !Array.isArray(data.acknowledged) || data.acknowledged.length !== events.length) throw new Error('Invalid counter receipt.');
    const ids = new Set(events.map(event => event.id));
    if (new Set(data.acknowledged).size !== ids.size || data.acknowledged.some(id => !ids.has(id))) throw new Error('Invalid counter receipt.');
    for (const metric of Object.keys(minimums)) if (!Number.isSafeInteger(data.totals?.[metric]) || data.totals[metric] < minimums[metric]) throw new Error('Invalid shared total.');
  }
  async function sync() {
    if (!live || sending || !navigator.onLine) return;
    clearTimeout(retryTimer);sending = true;
    try {
      let remaining = true;
      while (remaining) {
        const snapshot = await store.snapshot(), events = snapshot.events.slice(0, 50);
        const response = await fetch(config.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events, legacy }), credentials: 'omit', cache: 'no-store', keepalive: true, referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error('Counter service unavailable.');
        const data = await response.json();validateReceipt(data, events);
        await store.acknowledge(data.totals, data.acknowledged);failures = 0;
        if (events.length || Object.keys(minimums).some(metric => data.totals[metric] !== snapshot.totals[metric])) channel?.postMessage('receipt');
        await paint();
        remaining = (await store.snapshot()).events.length > 0;
      }
      schedule(30000);
    } catch {
      // Keep the exact event IDs until an acknowledged receipt arrives.
      await paint().catch(() => {});schedule(Math.min(60000, 2000 * 2 ** Math.min(failures++, 5)));
    } finally { sending = false; }
  }
  async function record(metric) {
    if (!live) { nodes[metric].textContent = format.format(Number(nodes[metric].textContent.replace(/,/g, '')) + 1);return; }
    try {
      await store.enqueue({ id: crypto.randomUUID(), metric });storageFailure = false;
      await paint();channel?.postMessage('queued');sync();
    } catch {
      storageFailure = true;if (metric === 'likes') message('likeStorageError');
    }
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let celebrationTimer;
  function celebrate() {
    clearTimeout(celebrationTimer);likeButton.classList.add('is-celebrating');
    celebrationTimer = setTimeout(() => likeButton.classList.remove('is-celebrating'), 450);
    if (reducedMotion) return;
    likeButton.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.13)' }, { transform: 'scale(1)' }], { duration: 260 });
    const box = likeButton.getBoundingClientRect(), colors = ['#c55349', '#ed91ac', '#306fc6', '#f0b9c9'];
    for (let i = 0; i < 5; i++) {
      const heart = document.createElement('span');heart.className = 'like-particle';heart.setAttribute('aria-hidden', 'true');heart.textContent = i === 4 ? '✦' : '♥';
      heart.style.left = `${box.left + box.width / 2}px`;heart.style.top = `${box.top + 4}px`;
      heart.style.setProperty('--dx', `${(Math.random() - .5) * 85}px`);heart.style.setProperty('--dy', `${-60 - Math.random() * 55}px`);
      heart.style.setProperty('--turn', `${(Math.random() - .5) * 65}deg`);heart.style.setProperty('--particle-color', colors[i % colors.length]);heart.style.setProperty('--particle-size', `${12 + Math.random() * 9}px`);
      document.body.appendChild(heart);heart.addEventListener('animationend', () => heart.remove(), { once: true });
    }
  }
  likeButton.addEventListener('click', () => { celebrate();record('likes'); });
  document.querySelectorAll('a.download').forEach(link => link.addEventListener('click', () => record('downloads')));
  channel?.addEventListener('message', event => { paint().catch(() => {});if (event.data === 'queued') sync(); });
  window.addEventListener('online', () => sync());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
  paint().then(() => { if (live) record('visits'); }).catch(() => { storageFailure = true;message('likeStorageError'); });
})();
