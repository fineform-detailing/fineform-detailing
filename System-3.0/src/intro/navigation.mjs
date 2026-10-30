import { INTRO, normalizePath, transitionDestination, writeStorage, removeStorage, browserStorage } from './config.mjs';

/**
 * Preserve browser navigation instead of fetching/replacing HTML as a mini SPA.
 * The destination's bootstrap consumes the short-lived public-route handoff.
 */
export function installIntroNavigation(window, controller, allowed, navigate = url => window.location.assign(url)) {
  const storage = browserStorage(window, 'sessionStorage');
  const listeners = new window.AbortController();

  async function handleClick(event) {
    if (!allowed()) return;
    const destination = transitionDestination(event, window.location);
    if (!destination) return;
    event.preventDefault();
    if (controller.active) return;

    const pending = JSON.stringify({
      destination: normalizePath(destination.pathname) + destination.search,
      createdAt: Date.now(),
    });
    try {
      if (writeStorage(storage, INTRO.pendingKey, pending)) {
        const covered = await controller.cover();
        if (!covered) { removeStorage(storage, INTRO.pendingKey); return; }
      }
      // Storage failure falls back to immediate, regular same-origin navigation.
      navigate(destination.href);
    } catch {
      removeStorage(storage, INTRO.pendingKey);
      controller.skip();
    }
  }

  window.document.addEventListener('click', event => {
    handleClick(event).catch(() => controller.skip());
  }, { signal: listeners.signal });
  return () => listeners.abort();
}
