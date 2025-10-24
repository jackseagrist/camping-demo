export const isStandalone = () =>
  (window.navigator as any).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;

export const isSafari = () =>
  /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
