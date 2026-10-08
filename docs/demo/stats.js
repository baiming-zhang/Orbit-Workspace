(() => {
  const BASE_VISITS = 1135, BASE_DOWNLOADS = 178, BASE_LIKES = 268;
  const visits = document.getElementById('visit-count'), downloads = document.getElementById('download-count');
  const likes = document.getElementById('like-count'), likeButton = document.getElementById('like-orbit'), feedback = document.getElementById('like-feedback');
  const countKey = 'baiming-zhang-orbit-workspace-visits-20261008-d71340e1';
  const likeKey = 'baiming-zhang-orbit-workspace-likes-20261008-c37421da';
  const storeKey = 'orbit-workspace:public-stats:v1';
  const format = new Intl.NumberFormat('en-US');
  let cached = {};
  try { cached = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch {}
  const valid = (value, minimum) => Number.isSafeInteger(value) && value >= minimum;
  function render(kind, value) {
    const minimum = kind === 'visits' ? BASE_VISITS : kind === 'likes' ? BASE_LIKES : BASE_DOWNLOADS;
    if (!valid(value, minimum)) throw new Error('Invalid statistics value.');
    (kind === 'visits' ? visits : kind === 'likes' ? likes : downloads).textContent = format.format(value);
    cached[kind] = value;
    try { localStorage.setItem(storeKey, JSON.stringify(cached)); } catch {}
  }
  for (const [kind, minimum] of [['visits', BASE_VISITS], ['downloads', BASE_DOWNLOADS], ['likes', BASE_LIKES]]) {
    if (valid(cached[kind], minimum)) render(kind, cached[kind]);
  }
  async function json(url) {
    const response = await fetch(url, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Statistics unavailable: HTTP ${response.status}`);
    return response.json();
  }
  const live = location.hostname === 'baiming-zhang.github.io' && /^\/Orbit-Workspace\/(?:index\.html)?$/.test(location.pathname);
  let confirmedLikes = valid(cached.likes, BASE_LIKES) ? cached.likes : BASE_LIKES, pendingLikes = 0, sending = false;
  function paintLikes() { likes.textContent = format.format(confirmedLikes + pendingLikes); }
  json(`https://countapi.mileshilliard.com/api/v1/get/${likeKey}`)
    .then(data => {
      const value = Number(data.value);
      if (!valid(value, BASE_LIKES)) throw new Error('Invalid like count.');
      confirmedLikes = Math.max(confirmedLikes, value);
      render('likes', confirmedLikes); paintLikes(); likes.dataset.source = 'shared';
    }).catch(() => {});
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let celebrationTimer;
  function celebrate() {
    clearTimeout(celebrationTimer);
    likeButton.classList.add('is-celebrating');
    celebrationTimer = setTimeout(() => likeButton.classList.remove('is-celebrating'), 450);
    if (reducedMotion) return;
    likeButton.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.13)' }, { transform: 'scale(1)' }], { duration: 260 });
    const box = likeButton.getBoundingClientRect(), colors = ['#c55349', '#ed91ac', '#306fc6', '#f0b9c9'];
    for (let i = 0; i < 5; i++) {
      const heart = document.createElement('span');
      heart.className = 'like-particle'; heart.setAttribute('aria-hidden', 'true'); heart.textContent = i === 4 ? '✦' : '♥';
      heart.style.left = `${box.left + box.width / 2}px`; heart.style.top = `${box.top + 4}px`;
      heart.style.setProperty('--dx', `${(Math.random() - .5) * 85}px`);
      heart.style.setProperty('--dy', `${-60 - Math.random() * 55}px`);
      heart.style.setProperty('--turn', `${(Math.random() - .5) * 65}deg`);
      heart.style.setProperty('--particle-color', colors[i % colors.length]);
      heart.style.setProperty('--particle-size', `${12 + Math.random() * 9}px`);
      document.body.appendChild(heart); heart.addEventListener('animationend', () => heart.remove(), { once: true });
    }
  }
  async function sendLikes() {
    if (sending) return;
    sending = true;
    while (pendingLikes > 0) {
      try {
        const data = await json(`https://countapi.mileshilliard.com/api/v1/hit/${likeKey}`);
        const value = Number(data.value);
        if (!valid(value, BASE_LIKES)) throw new Error('Invalid like count.');
        pendingLikes--;
        confirmedLikes = Math.max(confirmedLikes, value);
        render('likes', confirmedLikes); likes.dataset.source = 'shared'; feedback.hidden = true;
      } catch {
        pendingLikes--;
        feedback.dataset.i18n = 'likeError'; window.OrbitI18n.apply(); feedback.hidden = false;
      }
      paintLikes();
    }
    sending = false;
  }
  likeButton.addEventListener('click', () => {
    celebrate(); feedback.hidden = true;
    if (!live) { confirmedLikes++; paintLikes(); return; }
    pendingLikes++; paintLikes(); sendLikes();
  });
  json(`https://countapi.mileshilliard.com/api/v1/${live ? 'hit' : 'get'}/${countKey}`)
    .then(data => { render('visits', Number(data.value)); visits.dataset.source = 'shared'; })
    .catch(() => { visits.dataset.i18nTitle = 'visitsCached'; window.OrbitI18n.apply(); });
  json(live ? 'https://raw.githubusercontent.com/baiming-zhang/Orbit-Workspace/gh-pages/site-stats.json' : './site-stats.json')
    .then(data => { render('downloads', data.downloads.total); downloads.dataset.source = 'github'; downloads.dataset.i18nTitle = 'downloadsLive'; window.OrbitI18n.apply(); })
    .catch(() => { downloads.dataset.i18nTitle = 'downloadsCached'; window.OrbitI18n.apply(); });
})();
