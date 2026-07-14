import { assetUrl } from "@/lib/assets";

// This template's asset namespace, bound once. Sections call asset("/images/x")
// and get "/templates/villa/images/x" — the same file name in another template
// resolves to that template's folder, so the two can never collide.
//
// A plain function, not a context value: it works identically in server and
// client components, which is what lets a section render its markup on the
// server without dragging the template object into the browser.
export const asset = (path: string) => assetUrl("villa", path);
