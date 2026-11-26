// Key-value storage on web (the browser preview): the browser's own
// localStorage. Native uses kv.native.ts instead.
export const kv: Storage = globalThis.localStorage;
