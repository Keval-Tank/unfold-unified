import type { TemplateData } from "./template-types";

// ═══════════════════════════════════════════════════════════════════════════
//  The editor ⇄ live-preview protocol.
// ═══════════════════════════════════════════════════════════════════════════
//  Two windows, same origin: /edit holds the template in React state, and the
//  iframe on /preview/live renders it. The whole config crosses this channel —
//  which is fine, and is the point: the operator OWNS the config. The guarantee
//  we care about is that a GUEST's browser never receives it, and guest pages
//  (/couple/<slug>, /design/<slug>) are server-rendered and do not use this.
//
//  Both ends check event.origin. postMessage from another origin is otherwise
//  perfectly able to reach a listener.

export const PREVIEW_READY = "unfold:preview-ready";
export const PREVIEW_DATA = "unfold:preview-data";

/** iframe → editor: mounted and listening. Sent on mount, so a reload re-syncs. */
export type PreviewReadyMessage = { type: typeof PREVIEW_READY };

/** editor → iframe: render this. Sent on EVERY change — no debounce, no reload. */
export type PreviewDataMessage = { type: typeof PREVIEW_DATA; data: TemplateData };

export type PreviewMessage = PreviewReadyMessage | PreviewDataMessage;
