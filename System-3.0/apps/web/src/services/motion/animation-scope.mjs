/** Finite animation ownership: cancellation also settles every pending wait. */
export function createAnimationScope(window) {
  const controller = new window.AbortController();
  const animations = new Set();
  const { signal } = controller;

  function sleep(milliseconds) {
    if (signal.aborted) return Promise.resolve(false);
    return new Promise((resolve) => {
      const finish = () => {
        window.clearTimeout(timer);
        signal.removeEventListener("abort", finish);
        resolve(!signal.aborted);
      };
      const timer = window.setTimeout(finish, milliseconds);
      signal.addEventListener("abort", finish, { once: true });
    });
  }

  async function animate(element, keyframes, options) {
    if (signal.aborted) return false;
    if (!element || typeof element.animate !== "function") return true;
    const animation = element.animate(keyframes, {
      fill: "forwards",
      ...options,
    });
    animations.add(animation);
    try {
      await animation.finished;
      return !signal.aborted;
    } catch {
      return false;
    }
  }

  function cancel() {
    controller.abort();
    for (const animation of animations) animation.cancel();
    animations.clear();
  }

  return { signal, sleep, animate, cancel };
}
