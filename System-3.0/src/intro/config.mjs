/** Shared contract for the head bootstrap, controller and public-page navigation. */
export const INTRO = Object.freeze({
  seenKey: 'ff-intro-seen-v1',
  pendingKey: 'ff-intro-navigation-v1',
  motionKey: 'ff-motion-paused',
  publicPaths: ['/'],
  navigationExpiry: 15_000,
  bootDeadline: 2_000,
  activeDeadline: 2_000,
  minimumLoading: 250,
  readinessDeadline: 450,
  reachDuration: 260,
  gripDuration: 80,
  pullDuration: 320,
  coverDuration: 220,
});

export const normalizePath = path => path.replace(/\/index\.html$/, '/').replace(/\/?$/, '/');
export const isPublicPath = path => INTRO.publicPaths.includes(normalizePath(path));

export function browserStorage(window, name) {
  try { return window[name]; } catch { return null; }
}

export function readStorage(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}

export function writeStorage(storage, key, value) {
  try { storage.setItem(key, value); return true; } catch { return false; }
}

export function removeStorage(storage, key) {
  try { storage.removeItem(key); } catch { /* Storage may be disabled. */ }
}

export function pendingMatches(value, location, timestamp = Date.now()) {
  if (!value || value.length > 2_048) return false;
  try {
    const pending = JSON.parse(value);
    return Number.isFinite(pending.createdAt)
      && timestamp >= pending.createdAt
      && timestamp - pending.createdAt < INTRO.navigationExpiry
      && pending.destination === normalizePath(location.pathname) + location.search;
  } catch { return false; }
}

/** Deep links and browser history remain immediate; only marketing pages opt in. */
export function introMode({ location, reduced, paused, seen, pending, navigationType, saveData }) {
  if (!isPublicPath(location.pathname) || location.hash || reduced || paused || saveData || navigationType === 'back_forward') return null;
  return seen ? null : 'first';
}

export function transitionDestination(event, location) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = event.target.closest?.('a[href]');
  if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self') || anchor.relList.contains('external')) return null;
  let destination;
  try { destination = new URL(anchor.href, location.href); } catch { return null; }
  if (destination.origin !== location.origin || !isPublicPath(destination.pathname) || destination.hash) return null;
  if (destination.pathname === location.pathname && destination.search === location.search) return null;
  return destination;
}
