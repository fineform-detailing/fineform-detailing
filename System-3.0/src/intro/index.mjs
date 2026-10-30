import './intro.css';
import { createIntroController } from './controller.mjs';

function initialize() {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controller = createIntroController(window);
  const allowed = () => window.ffMotion?.enabled?.() ?? !motion.matches;

  window.ffIntro = { skip: controller.skip, replay: () => allowed() ? controller.open('replay') : Promise.resolve() };
  window.clearTimeout(window.ffIntroBoot?.deadline);

  // Only the home entrance and explicit replay use the curtain.
  if (document.documentElement.hasAttribute('data-ff-intro') && allowed() && !document.hidden) {
    controller.open(window.ffIntroBoot?.mode ?? 'first');
  } else {
    controller.skip();
  }

  const utilities = document.querySelector('.footer-utilities, .links-utilities');
  if (utilities) {
    const replay = document.createElement('button');
    replay.type = 'button';
    replay.textContent = 'Rever abertura';
    replay.dataset.introReplay = '';
    replay.hidden = !allowed();
    replay.addEventListener('click', () => window.ffIntro.replay());
    utilities.append(replay);
    window.addEventListener('ff:motion', () => { replay.hidden = !allowed(); });
  }


  const stopIfNeeded = () => {
    if (document.hidden) controller.cancel('hidden');
    else if (!allowed()) controller.skip();
  };
  window.addEventListener('ff:motion', stopIfNeeded);
  motion.addEventListener('change', stopIfNeeded);
  document.addEventListener('visibilitychange', stopIfNeeded);
  window.addEventListener('pagehide', () => controller.cancel('pagehide'));
  window.addEventListener('pageshow', event => { if (event.persisted) controller.cancel('restored'); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
