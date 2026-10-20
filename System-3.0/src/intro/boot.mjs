import { INTRO, introMode, readStorage, removeStorage, browserStorage } from './config.mjs';

// A tiny, synchronous head script chooses the first frame before body parsing.
// It never loads images, waits for the network or stores customer information.
try {
  const storage = browserStorage(window, 'sessionStorage');
  const mode = introMode({
    location: window.location,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    paused: readStorage(browserStorage(window, 'localStorage'), INTRO.motionKey) === '1',
    seen: readStorage(storage, INTRO.seenKey),
    pending: readStorage(storage, INTRO.pendingKey),
    navigationType: performance.getEntriesByType('navigation')[0]?.type,
    saveData: navigator.connection?.saveData,
  });
  removeStorage(storage, INTRO.pendingKey);
  if (mode && !document.prerendering) {
    document.documentElement.dataset.ffIntro = 'loading';
    window.ffIntroBoot = {
      mode,
      deadline: window.setTimeout(() => {
        window.ffIntro?.skip();
        document.documentElement.removeAttribute('data-ff-intro');
      }, INTRO.bootDeadline),
    };
  }
} catch {
  // With unavailable browser APIs or storage, the regular page is the fallback.
  document.documentElement.removeAttribute('data-ff-intro');
}
