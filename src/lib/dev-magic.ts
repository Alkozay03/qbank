// src/lib/dev-magic.ts
declare global {
  // ensure a single shared object in dev
   
  var __devMagic__: { email?: string; url?: string } | undefined;
}

const store = globalThis.__devMagic__ ?? (globalThis.__devMagic__ = {});

export function setDevMagic(email: string, url: string) {
  store.email = email;
  store.url = url;
}

export function getDevMagic() {
  return store;
}
