Object.defineProperty(globalThis, 'self', {
  configurable: true,
  value: globalThis,
});

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: globalThis,
});
