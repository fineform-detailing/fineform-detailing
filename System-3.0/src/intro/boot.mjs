import { INTRO, introMode, readStorage, browserStorage } from './config.mjs';

// Pick the first frame before body parsing; a failed module never traps the page.
try {
  const mode = introMode({
    location: window.location,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    paused: readStorage(browserStorage(window, 'localStorage'), INTRO.motionKey) === '1',
    seen: readStorage(browserStorage(window, 'sessionStorage'), INTRO.seenKey),
    navigationType: performance.getEntriesByType('navigation')[0]?.type,
    saveData: navigator.connection?.saveData,
  });
  if (mode && !document.prerendering) {
    document.documentElement.dataset.ffIntro = 'ready';
    window.ffIntroBoot = {
      mode,
      deadline: window.setTimeout(() => {
        window.ffIntro?.skip();
        document.documentElement.removeAttribute('data-ff-intro');
      }, INTRO.bootDeadline),
    };
  }
} catch {
  document.documentElement.removeAttribute('data-ff-intro');
}
