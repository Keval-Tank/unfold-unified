// NEXT_PUBLIC_* vars are inlined at build time, so this works in client components.
// Unset (local dev, root serving) => "" and paths pass through unchanged.
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const withBase = (path: string) => `${BASE}${path}`;
