import { ICONS } from './icons';

// A tiny registry, name -> raw SVG string. Pre-seeded from icons.js, but
// any plugin can add its own with IconStore.set(name, svg) at import time —
// same self-registration pattern Jodit itself uses for per-plugin icons.
const store = new Map(Object.entries(ICONS));

export const IconStore = {
  set(name, svg) {
    store.set(name, svg);
    return IconStore;
  },
  get(name) {
    return store.get(name) || '';
  },
  has(name) {
    return store.has(name);
  },
};

export default IconStore;
