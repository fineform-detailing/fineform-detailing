import { INTRO, writeStorage, browserStorage } from './config.mjs';
import { createAnimationScope } from './animation-scope.mjs';
import { fitTentacle } from './tentacle-layout.mjs';

const easeOut = 'cubic-bezier(.18,.8,.2,1)';
const easePull = 'cubic-bezier(.7,0,.2,1)';

/** Only the first photo and the main font matter; lazy content never holds the intro. */
export async function criticalContentReady(document, signal) {
  const image = document.querySelector('.ff-hero img, .links-photo img');
  let imageReady = Promise.resolve();
  if (image && !image.complete) {
    imageReady = typeof image.decode === 'function'
      ? image.decode()
      : new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true, signal });
        image.addEventListener('error', resolve, { once: true, signal });
        signal.addEventListener('abort', resolve, { once: true });
      });
  }
  const fontReady = document.fonts?.load('600 16px "FF Sans"') ?? Promise.resolve();
  await Promise.allSettled([imageReady, fontReady]);
}

/** ready → dragging → reaching → gripping → revealing. No timer advances ready. */
export function createIntroController(window, options = {}) {
  const document = window.document;
  const config = { ...INTRO, ...options.timing };
  const shell = document.getElementById('ff-intro');
  if (!shell) throw new Error('Fine Form intro shell is missing.');
  const elements = {
    sheet: shell.querySelector('[data-intro-sheet]'),
    center: shell.querySelector('[data-intro-center]'),
    arm: shell.querySelector('[data-intro-tentacle]'),
    tip: shell.querySelector('.intro-arm-tip'),
    fold: shell.querySelector('.intro-fold'),
    spark: shell.querySelector('.intro-grip-spark'),
    status: shell.querySelector('[data-intro-label]'),
    skip: shell.querySelector('[data-intro-skip]'),
    track: shell.querySelector('[data-intro-slider]'),
    handle: shell.querySelector('[data-intro-handle]'),
    fill: shell.querySelector('[data-intro-fill]'),
  };
  let current = null, pointer = null, frame = 0;
  const listeners = new window.AbortController();
  const listen = (target, name, handler) => target.addEventListener(name, handler, { signal: listeners.signal });
  const armTransform = p => `translate3d(${24 * (1 - p)}%,${8 * (1 - p)}%,0) rotate(${3 * (1 - p)}deg)`;

  function phase(value) {
    document.documentElement.dataset.ffIntro = value;
    shell.dataset.phase = value;
  }
  function releasePointer() {
    const previous = pointer;
    pointer = null;
    if (previous) {
      try { elements.handle.releasePointerCapture?.(previous.id); } catch { /* Already released. */ }
    }
  }
  function stopFrame() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  }
  function renderProgress(run, progress) {
    run.progress = Math.max(0, Math.min(1, progress));
    elements.handle.style.transform = `translate3d(${run.travel * run.progress}px,0,0)`;
    elements.fill.style.transform = `scaleX(${run.progress})`;
    elements.arm.style.transform = armTransform(run.progress);
    elements.tip.style.transform = `rotate(${-4 * run.progress}deg)`;
  }
  function measure(run) {
    run.travel = Math.max(1, elements.track.clientWidth - elements.handle.offsetWidth - 12);
    fitTentacle(elements.arm.querySelector('svg'), {
      width: elements.arm.clientWidth,
      height: elements.arm.clientHeight,
      left: elements.arm.offsetLeft,
      viewportWidth: elements.sheet.clientWidth,
    });
  }
  function finish(reason = 'complete') {
    const run = current;
    current = null;
    stopFrame();
    releasePointer();
    if (run) {
      window.clearTimeout(run.watchdog);
      run.scope.cancel();
      for (const { element, wasInert } of run.inert) {
        if (!wasInert) element.removeAttribute('inert');
      }
    }
    shell.hidden = true;
    shell.removeAttribute('data-phase');
    document.documentElement.removeAttribute('data-ff-intro');
    for (const name of ['handle', 'fill', 'arm', 'tip']) elements[name].style.removeProperty('transform');
    if (!run) return;
    writeStorage(browserStorage(window, 'sessionStorage'), config.seenKey, '1');
    if (run.focusBefore?.isConnected && run.focusBefore !== document.body) {
      run.focusBefore.focus?.({ preventScroll: true });
    } else {
      const main = document.querySelector('main');
      if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
    }
    document.dispatchEvent(new window.CustomEvent('ff:intro-complete', { detail: { reason } }));
    run.resolve({ reason, mode: run.mode });
  }

  async function reveal(run) {
    const { scope } = run;
    phase('reaching');
    elements.status.textContent = 'Pode deixar com a Fine Form.';
    await Promise.all([
      Promise.race([run.ready, scope.sleep(config.readinessDeadline)]),
      scope.animate(elements.handle, [
        { transform: `translate3d(${run.travel * run.progress}px,0,0)` },
        { transform: `translate3d(${run.travel}px,0,0)` },
      ], { duration: config.reachDuration, easing: easeOut }),
      scope.animate(elements.fill, [{ transform: `scaleX(${run.progress})` }, { transform: 'scaleX(1)' }], { duration: config.reachDuration, easing: easeOut }),
      scope.animate(elements.arm, [
        { transform: armTransform(run.progress) },
        { transform: 'translate3d(0,0,0) rotate(0)' },
      ], { duration: config.reachDuration, easing: easeOut }),
      scope.animate(elements.tip, [
        { transform: `rotate(${-4 * run.progress}deg)` },
        { transform: 'rotate(-6deg)', offset: .65 },
        { transform: 'rotate(0)' },
      ], { duration: config.reachDuration, easing: easeOut }),
    ]);
    if (current !== run || scope.signal.aborted) return;
    phase('gripping');
    await Promise.all([
      scope.animate(elements.center, [{ opacity: 1 }, { opacity: 0 }], { duration: config.gripDuration + 80, easing: easeOut }),
      scope.animate(elements.fold, [
        { opacity: 0, transform: 'scaleX(.1) rotate(8deg)' },
        { opacity: 1, transform: 'scaleX(1) rotate(-3deg)' },
      ], { duration: config.gripDuration, easing: easeOut }),
      scope.animate(elements.spark, [
        { opacity: 0, transform: 'scale(.4)' },
        { opacity: 1, transform: 'scale(1)', offset: .5 },
        { opacity: 0, transform: 'scale(1.2)' },
      ], { duration: config.gripDuration + 80, easing: easeOut }),
    ]);
    if (current !== run || scope.signal.aborted) return;
    phase('revealing');
    await scope.animate(elements.sheet, [
      { transform: 'translate3d(0,0,0) rotate(0)', offset: 0 },
      { transform: 'translate3d(-.7%,.4%,0) rotate(-.35deg)', offset: .12 },
      { transform: 'translate3d(7%,-.6%,0) rotate(.4deg)', offset: .3 },
      { transform: 'translate3d(116%,-5%,0) rotate(4deg)', offset: 1 },
    ], { duration: config.pullDuration, easing: easePull });
    if (current === run) finish();
  }
  function activate() {
    const run = current;
    if (!run || run.committed) return;
    run.committed = true;
    stopFrame();
    releasePointer();
    // The deadline guards an animation failure, never the user's thinking time.
    run.watchdog = window.setTimeout(() => finish('timeout'), config.activeDeadline);
    reveal(run).catch(() => { if (current === run) finish('error'); });
  }
  function open(mode = 'first') {
    if (current) return current.promise;
    const scope = createAnimationScope(window);
    const inert = [...document.querySelectorAll('body > header, body > main, body > footer, body > .skip-link')]
      .map(element => ({ element, wasInert: element.hasAttribute('inert') }));
    const focusBefore = document.activeElement;
    for (const { element } of inert) element.setAttribute('inert', '');
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    const run = current = { mode, scope, inert, focusBefore, promise, resolve, progress: 0, committed: false };
    shell.hidden = false;
    phase('ready');
    elements.status.textContent = 'Arraste para a direita';
    try {
      measure(run);
      renderProgress(run, 0);
      // A rejected image/font or slow resource cannot block a completed gesture.
      run.ready = Promise.resolve().then(() => options.ready?.(scope.signal) ?? criticalContentReady(document, scope.signal)).catch(() => {});
      shell.setAttribute('tabindex', '-1');
      shell.focus({ preventScroll: true });
    } catch { finish('error'); }
    return promise;
  }
  function resetGesture() {
    if (!current || current.committed) return;
    stopFrame();
    releasePointer();
    phase('ready');
    renderProgress(current, 0);
  }

  listen(elements.handle, 'pointerdown', event => {
    if (!current || current.committed || pointer || event.isPrimary === false || event.button !== 0) return;
    measure(current);
    pointer = { id: event.pointerId, x: event.clientX };
    phase('dragging');
    try { elements.handle.setPointerCapture?.(event.pointerId); } catch { /* Window listeners remain available. */ }
    elements.handle.focus({ preventScroll: true });
    event.preventDefault();
  });
  listen(window, 'pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id || !current || current.committed) return;
    const run = current;
    run.progress = Math.max(0, Math.min(1, (event.clientX - pointer.x) / run.travel));
    if (run.progress >= config.dragThreshold) {
      renderProgress(run, run.progress);
      activate();
    } else if (!frame) {
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (current === run && !run.committed) renderProgress(run, run.progress);
      });
    }
  });
  listen(window, 'pointerup', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const progress = Math.max(0, Math.min(1, (event.clientX - pointer.x) / current.travel));
    if (progress >= config.dragThreshold) { renderProgress(current, progress); activate(); }
    else resetGesture();
  });
  listen(window, 'pointercancel', event => { if (pointer?.id === event.pointerId) resetGesture(); });
  listen(elements.handle, 'lostpointercapture', event => { if (pointer?.id === event.pointerId) resetGesture(); });
  // Native keyboard/assistive clicks work; a short drag's synthetic click must not enter.
  listen(elements.handle, 'click', event => { if (event.detail === 0) activate(); });
  listen(elements.handle, 'keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); activate(); }
  });
  listen(elements.skip, 'click', () => finish('skipped'));
  listen(window, 'resize', () => {
    if (!current || current.committed) return;
    resetGesture();
    try { measure(current); renderProgress(current, 0); } catch { finish('error'); }
  });
  listen(document, 'keydown', event => {
    if (!current) return;
    if (event.key === 'Escape') { event.preventDefault(); finish('skipped'); }
    if (event.key === 'Tab') {
      event.preventDefault();
      const active = document.activeElement;
      const target = active === elements.handle ? elements.skip : active === elements.skip ? elements.handle : event.shiftKey ? elements.skip : elements.handle;
      target.focus({ preventScroll: true });
    }
  });
  return {
    open,
    skip: () => finish('skipped'),
    cancel: reason => finish(reason ?? 'cancelled'),
    get active() { return Boolean(current); },
    destroy() { finish('destroyed'); listeners.abort(); },
  };
}
