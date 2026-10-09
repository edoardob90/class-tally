// Client-only app: all data lives in IndexedDB. Every route is prerendered as a plain shell,
// written as <route>/index.html so that any static host serves it.
export const ssr = false;
export const prerender = true;
export const trailingSlash = 'always';
