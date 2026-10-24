import { JSDOM } from "jsdom";
export const dom = new JSDOM(
  '<!doctype html><html lang="pt-BR"><body></body></html>',
  { url: "http://localhost:3000/", pretendToBeVisual: true },
);
const w = dom.window;
for (const key of [
  "window",
  "document",
  "navigator",
  "location",
  "history",
  "localStorage",
  "sessionStorage",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLDialogElement",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "CustomEvent",
  "FormData",
  "getComputedStyle",
])
  Object.defineProperty(globalThis, key, {
    value:
      key === "window" ? w : (w as unknown as Record<string, unknown>)[key],
    configurable: true,
    writable: true,
  });
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  value: true,
  writable: true,
  configurable: true,
});
w.matchMedia = () => ({
  matches: true,
  media: "",
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() {
    return true;
  },
  onchange: null,
});
Object.defineProperty(globalThis, "matchMedia", {
  value: w.matchMedia,
  configurable: true,
  writable: true,
});
w.HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
w.HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
w.HTMLElement.prototype.scrollIntoView = function () {};
Object.defineProperty(w, "isSecureContext", {
  value: false,
  configurable: true,
});
Object.defineProperty(globalThis, "HTMLFormElement", {
  value: w.HTMLFormElement,
  configurable: true,
});
Object.defineProperty(globalThis, "WebSocket", {
  value: class {
    constructor() {
      throw Error("Manual refresh in DOM integration tests.");
    }
  },
  configurable: true,
});
Object.defineProperty(globalThis, "confirm", {
  value: () => true,
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, "prompt", {
  value: () => null,
  configurable: true,
  writable: true,
});
