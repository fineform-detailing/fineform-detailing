import { INTRO, writeStorage, browserStorage } from './config.mjs';
import { createAnimationScope } from './animation-scope.mjs';
import { fitTentacle } from './tentacle-layout.mjs';

const easeOut = 'cubic-bezier(.18,.8,.2,1)';
const easePull = 'cubic-bezier(.7,0,.2,1)';

/** Only the first photo and the main font matter; lazy content never holds the intro. */
export async function criticalContentReady(document, signal) {
  const image = document.querySelector('.fn-hero img, .ff-hero img, .links-photo img');
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

/**
 * States: idle → loading → reaching → gripping → revealing → idle.
 * A departure uses idle → covering; normal browser navigation owns the next page.
 * Every route out (complete, skip, error, timeout, pagehide) shares finish().
 */
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
  };
  let current = null;

  function phase(value) {
    document.documentElement.dataset.ffIntro = value;
    shell.dataset.phase = value;
  }

  function finish(reason = 'complete') {
    const run = current;
    if (!run) {
      document.documentElement.removeAttribute('data-ff-intro');
      shell.hidden = true;
      return;
    }
    current = null;
    run.reason = reason;
    window.clearTimeout(run.watchdog);
    run.scope.cancel();
    for (const { element, wasInert } of run.inert) {
      if (!wasInert) element.removeAttribute('inert');
    }
    shell.hidden = true;
    shell.removeAttribute('data-phase');
    document.documentElement.removeAttribute('data-ff-intro');
    writeStorage(browserStorage(window, 'sessionStorage'), config.seenKey, '1');
    if (run.focusBefore?.isConnected && run.focusBefore !== document.body) {
      run.focusBefore.focus?.({ preventScroll: true });
    }
    document.dispatchEvent(new window.CustomEvent('ff:intro-complete', { detail: { reason } }));
    run.resolve({ reason, mode: run.mode });
  }

  function begin(mode) {
    if (current) return current;
    const scope = createAnimationScope(window);
    const inert = [...document.querySelectorAll('body > header, body > main, body > footer, body > .skip-link')]
      .map(element => ({ element, wasInert: element.hasAttribute('inert') }));
    const focusBefore = document.activeElement;
    for (const { element } of inert) element.setAttribute('inert', '');
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    current = { mode, scope, inert, focusBefore, promise, resolve };
    current.watchdog = window.setTimeout(() => finish('timeout'), config.activeDeadline);
    shell.hidden = false;
    elements.status.textContent = 'Carregando Fine Form';
    phase(mode === 'departure' ? 'covering' : 'loading');
    try {
      fitTentacle(elements.arm.querySelector('svg'), {
        width: elements.arm.clientWidth,
        height: elements.arm.clientHeight,
        left: elements.arm.offsetLeft,
        viewportWidth: elements.sheet.clientWidth,
      });
    } catch { /* A malformed future illustration falls back to the authored SVG. */ }
    return current;
  }

  async function reveal(run) {
    const { scope } = run;
    const ready = options.ready?.(scope.signal) ?? criticalContentReady(document, scope.signal);
    await Promise.all([
      scope.sleep(run.mode === 'arrival' ? 60 : config.minimumLoading),
      Promise.race([Promise.resolve(ready).catch(() => {}), scope.sleep(config.readinessDeadline)]),
    ]);
    if (current !== run || scope.signal.aborted) return;

    phase('reaching');
    elements.status.textContent = 'Um toque Fine Form.';
    await Promise.all([
      scope.animate(elements.center, [
        { opacity: 1, transform: 'translate3d(0,0,0)' },
        { opacity: 0, transform: 'translate3d(-20px,-12px,0)' },
      ], { duration: 270, easing: easeOut }),
      scope.animate(elements.arm, [
        { transform: 'translate3d(112%,22%,0) rotate(9deg)', offset: 0 },
        { transform: 'translate3d(-2%,-1%,0) rotate(-1deg)', offset: .82 },
        { transform: 'translate3d(0,0,0) rotate(0)', offset: 1 },
      ], { duration: config.reachDuration, easing: easeOut }),
      scope.animate(elements.tip, [
        { transform: 'rotate(6deg)' },
        { transform: 'rotate(-4deg)', offset: .72 },
        { transform: 'rotate(0)' },
      ], { duration: config.reachDuration, easing: easeOut }),
    ]);
    if (current !== run || scope.signal.aborted) return;

    phase('gripping');
    await Promise.all([
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

  function open(mode = 'first') {
    if (current) return current.promise;
    const run = begin(mode);
    reveal(run).catch(() => { if (current === run) finish('error'); });
    return run.promise;
  }

  async function cover() {
    if (current) return false;
    const run = begin('departure');
    elements.status.textContent = 'Vamos ao seu próximo cuidado.';
    try {
      await run.scope.animate(elements.sheet, [
        { transform: 'translate3d(-112%,0,0) rotate(-2deg)' },
        { transform: 'translate3d(0,0,0) rotate(0)' },
      ], { duration: config.coverDuration, easing: easeOut });
      return current === run || ['skipped', 'timeout', 'error'].includes(run.reason);
    } catch { finish('error'); return false; }
  }

  const listeners = new window.AbortController();
  elements.skip.addEventListener('click', () => finish('skipped'), { signal: listeners.signal });
  document.addEventListener('keydown', event => {
    if (!current) return;
    if (event.key === 'Escape') { event.preventDefault(); finish('skipped'); }
    if (event.key === 'Tab') { event.preventDefault(); elements.skip.focus({ preventScroll: true }); }
  }, { signal: listeners.signal });

  return {
    open,
    cover,
    skip: () => finish('skipped'),
    cancel: reason => finish(reason ?? 'cancelled'),
    get active() { return Boolean(current); },
    destroy() { finish('destroyed'); listeners.abort(); },
  };
}
