export const isIOS = () =>
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) && 
  !('MSStream' in window);

export const canShareFiles = () =>
  typeof navigator !== 'undefined' &&
  // @ts-ignore
  typeof navigator.canShare === 'function' &&
  // @ts-ignore
  navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] }) &&
  // @ts-ignore
  typeof navigator.share === 'function';
