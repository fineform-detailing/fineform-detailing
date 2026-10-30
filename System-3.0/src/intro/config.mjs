/** Entry-only opening: public navigation never waits for the curtain. */
export const INTRO = Object.freeze({
  seenKey: 'ff-intro-seen-v2',
  motionKey: 'ff-motion-paused',
  bootDeadline: 5_000,
  activeDeadline: 3_000,
  readinessDeadline: 150,
  reachDuration: 180,
  gripDuration: 100,
  pullDuration: 580,
  dragThreshold: .86,
});

export const normalizePath = path => path.replace(/\/index\.html$/, '/').replace(/\/?$/, '/');

export function browserStorage(window, name) {
  try { return window[name]; } catch { return null; }
}
export function readStorage(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}
export function writeStorage(storage, key, value) {
  try { storage.setItem(key, value); return true; } catch { return false; }
}

export function introMode({ location, reduced, paused, seen, navigationType, saveData }) {
  if (normalizePath(location.pathname) !== '/' || location.hash || reduced || paused || saveData || seen || navigationType === 'back_forward') return null;
  return 'first';
}
