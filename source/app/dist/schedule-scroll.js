(() => {
  let session = null,
    frame = 0;
  const selector = '[data-summary="calendar"] .schedule-list';
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (session) {
      session.auto = false;
      session.tween = null;
    }
  }
  function capture() {
    const list = document.querySelector(selector);
    return list
      ? {
          date: list.dataset.scheduleDate,
          top: list.scrollTop,
          tail: list.querySelector('.schedule-scroll-tail')?.offsetHeight || 0,
        }
      : null;
  }
  function tail(list, height) {
    let spacer = list.querySelector('.schedule-scroll-tail');
    if (height > 0) {
      if (!spacer) {
        spacer = document.createElement('div');
        spacer.className = 'schedule-scroll-tail';
        spacer.setAttribute('aria-hidden', 'true');
        list.append(spacer);
      }
      spacer.style.height = height + 'px';
    } else spacer?.remove();
  }
  function restore(previous, date, isToday) {
    const list = document.querySelector(selector);
    if (!list) {
      stop();
      session = null;
      return;
    }
    const same = previous?.date === date;
    if (!same || !session || session.date !== date) {
      stop();
      session = { date, auto: isToday, tween: null };
    }
    list.dataset.scheduleDate = date;
    list.style.overflowAnchor = 'none';
    for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown'])
      list.addEventListener(type, stop, { passive: true });
    if (same) {
      tail(list, previous.tail);
      list.scrollTop = previous.top;
    }
    if (!session.auto) return;
    const item = list.querySelector('.schedule-item:not(.is-past)'),
      rows = list.querySelectorAll('.schedule-item');
    if (!rows.length) return;
    const top = item
      ? list.scrollTop +
        item.getBoundingClientRect().top -
        list.getBoundingClientRect().top -
        list.clientTop -
        parseFloat(getComputedStyle(list).paddingTop || 0)
      : list.scrollHeight - list.clientHeight;
    const destination = Math.max(0, top);
    if (item) {
      const existing = list.querySelector('.schedule-scroll-tail')?.offsetHeight || 0;
      tail(list, Math.max(0, destination + list.clientHeight - (list.scrollHeight - existing)));
    }
    const target = Math.min(destination, list.scrollHeight - list.clientHeight);
    const pending = !!list.querySelector('.schedule-load-note[role="status"]');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      list.scrollTop = target;
      session.auto = pending;
      return;
    }
    if (!session.tween || Math.abs(session.tween.target - target) > 1)
      session.tween = { from: list.scrollTop, target, start: performance.now() };
    session.list = list;
    cancelAnimationFrame(frame);
    const current = session;
    function step(now) {
      if (session !== current || !current.auto || !current.list.isConnected) return;
      const tween = current.tween,
        t = Math.min(1, (now - tween.start) / 650),
        eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      current.list.scrollTop = tween.from + (tween.target - tween.from) * eased;
      if (t < 1) frame = requestAnimationFrame(step);
      else {
        frame = 0;
        current.tween = null;
        current.auto = pending;
      }
    }
    frame = requestAnimationFrame(step);
  }
  window.OrbitScheduleScroll = { capture, restore };
})();
