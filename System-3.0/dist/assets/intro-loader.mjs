(function fineFormCometLoader() {
  // Fine Form loading adaptation of the React Bits Comet Dial:
  // radial ticks, luminous head, variable-width comet trail and a numeric readout.
  const doc = document;
  const root = doc.documentElement;
  const shell = doc.getElementById('ff-intro');
  if (!shell) { root.removeAttribute('data-ff-intro'); return; }
  const svg = shell.querySelector('[data-comet-dial]');
  const ticks = shell.querySelector('[data-comet-ticks]');
  const track = shell.querySelector('[data-comet-track]');
  const lit = shell.querySelector('[data-comet-lit]');
  const head = shell.querySelector('[data-comet-head]');
  const value = shell.querySelector('[data-comet-value]');
  const status = shell.querySelector('[data-intro-status]');
  const skip = shell.querySelector('[data-intro-skip]');
  const parts = [...shell.querySelectorAll('[data-comet-trail]')];
  const R = 78, startAngle = 110, sweep = 320;
  const point = deg => [100 + Math.cos(deg * Math.PI / 180) * R, 100 + Math.sin(deg * Math.PI / 180) * R];
  const path = (a, b) => {
    const p = point(a), q = point(b);
    return 'M ' + p[0].toFixed(3) + ' ' + p[1].toFixed(3) + ' A ' + R + ' ' + R + ' 0 ' + (b - a > 180 ? 1 : 0) + ' 1 ' + q[0].toFixed(3) + ' ' + q[1].toFixed(3);
  };
  track.setAttribute('d', path(startAngle, startAngle + sweep));
  for (let i = 0; i < 61; i++) {
    const deg = startAngle + sweep * (i / 60);
    const p = point(deg), q = [100 + Math.cos(deg * Math.PI / 180) * (i % 5 === 0 ? 66 : 70), 100 + Math.sin(deg * Math.PI / 180) * (i % 5 === 0 ? 66 : 70)];
    const line = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', p[0]); line.setAttribute('y1', p[1]);
    line.setAttribute('x2', q[0]); line.setAttribute('y2', q[1]);
    if (i % 5 === 0) line.classList.add('major');
    ticks.appendChild(line);
  }
  let active = null;
  const set = n => {
    const f = Math.min(1, Math.max(0, n / 100));
    const angle = startAngle + sweep * f;
    lit.setAttribute('d', f < .001 ? '' : path(startAngle, angle));
    const p = point(angle);
    head.setAttribute('cx', p[0].toFixed(3));
    head.setAttribute('cy', p[1].toFixed(3));
    const reach = Math.min(135, 26 + 110 * Math.sin(Math.PI * f));
    for (let j = 0; j < parts.length; j++) {
      const a = Math.max(startAngle, angle - (j + 1) * reach / parts.length);
      const b = Math.max(startAngle, angle - j * reach / parts.length);
      const visible = f > .003 && f < 1 && b - a > .005;
      parts[j].setAttribute('d', visible ? path(a, b) : '');
      parts[j].setAttribute('stroke-width', (4.5 + 9 * (1 - j / parts.length)).toFixed(2));
      parts[j].style.opacity = visible ? (0.74 * (1 - j / parts.length)).toFixed(3) : '0';
    }
    value.textContent = String(Math.round(n));
    svg.setAttribute('aria-valuenow', String(Math.round(n)));
  };
  set(0);
  function end(reason) {
    const run = active;
    if (!run) {
      root.removeAttribute('data-ff-intro');
      shell.hidden = true;
      return;
    }
    active = null;
    cancelAnimationFrame(run.raf);
    clearTimeout(run.watchdog);
    clearTimeout(run.exitTimer);
    for (const { el, inert } of run.inert) if (!inert) el.removeAttribute('inert');
    shell.hidden = true;
    shell.classList.remove('is-finishing');
    root.removeAttribute('data-ff-intro');
    try { sessionStorage.setItem('ff-intro-seen-v2', '1'); } catch {}
    if (reason === 'skipped' && run.previous?.isConnected) run.previous.focus?.({ preventScroll: true });
    doc.dispatchEvent(new CustomEvent('ff:intro-complete', { detail: { reason } }));
    run.resolve({ reason });
  }
  async function assetsReady() {
    const image = doc.querySelector('.ff-hero img');
    const tasks = [];
    if (image && !image.complete) {
      tasks.push(typeof image.decode === 'function' ? image.decode() : new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      }));
    }
    if (doc.fonts?.load) tasks.push(doc.fonts.load('600 16px "FF Sans"'));
    await Promise.allSettled(tasks);
  }
  function open(mode) {
    if (active) return active.promise;
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    const inert = [...doc.querySelectorAll('body > header, body > main, body > footer, body > .skip-link')].map(el => ({el, inert: el.hasAttribute('inert')}));
    for (const entry of inert) entry.el.setAttribute('inert', '');
    const run = { promise, resolve, inert, previous: doc.activeElement, raf: 0, watchdog: 0, exitTimer: 0, started: performance.now(), ready: false, finishing: false, progress: 0, finishStartedAt: null, finishFrom: 0 };
    active = run;
    shell.hidden = false;
    shell.classList.remove('is-finishing');
    root.dataset.ffIntro = 'ready';
    status.textContent = 'Preparando a sua experiência';
    set(0);
    assetsReady().then(() => { if (active === run) run.ready = true; }, () => { if (active === run) run.ready = true; });
    run.watchdog = setTimeout(() => end('timeout'), 4600);
    const frame = now => {
      if (active !== run) return;
      const ms = Math.max(0, now - run.started);

      // The waiting phase approaches 96%; starting the final phase never jumps to 100%.
      if (run.finishStartedAt === null) {
        const fraction = Math.min(1, ms / 2050);
        run.progress = Math.max(run.progress, 96 * (1 - Math.pow(1 - fraction, 1.45)));
        if ((run.ready && ms >= 1250) || ms >= 2900) {
          run.finishStartedAt = now;
          run.finishFrom = run.progress;
        }
      }

      // Animate the remaining arc from the value actually displayed, including 76–99%.
      if (run.finishStartedAt !== null) {
        const fraction = Math.min(1, (now - run.finishStartedAt) / 740);
        const eased = (1 - Math.cos(Math.PI * fraction)) / 2;
        run.progress = run.finishFrom + (100 - run.finishFrom) * eased;
      }
      set(run.progress);

      if (run.finishStartedAt !== null && now - run.finishStartedAt >= 740 && !run.finishing) {
        run.finishing = true;
        shell.classList.add('is-finishing');
        status.textContent = 'Tudo pronto';
        run.exitTimer = setTimeout(() => end('complete'), 260);
      } else if (!run.finishing) run.raf = requestAnimationFrame(frame);
    };
    run.raf = requestAnimationFrame(frame);
    return promise;
  }
  window.ffIntro = { skip: () => end('skipped'), replay: () => open('replay') };
  skip.addEventListener('click', () => end('skipped'));
  doc.addEventListener('keydown', e => { if (active && e.key === 'Escape') end('skipped'); });
  doc.addEventListener('visibilitychange', () => { if (active && doc.hidden) end('hidden'); });
  window.addEventListener('pagehide', () => { if (active) end('pagehide'); });
  window.addEventListener('pageshow', e => { if (active && e.persisted) end('restored'); });
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const boot = window.ffIntroBoot;
  if (boot?.deadline) clearTimeout(boot.deadline);
  if (root.hasAttribute('data-ff-intro') && !doc.hidden && !motion) open(boot?.mode || 'first');
  else { shell.hidden = true; root.removeAttribute('data-ff-intro'); }
})();
