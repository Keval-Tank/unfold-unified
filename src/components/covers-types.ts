// ── Cover design contract ────────────────────────────────────────────────────
//
// A "cover design" is the swappable *appearance* of the opening cover screen.
// The behavior (audio, enter gate, mute button, teardown) lives in the engine —
// src/components/CoverScreen.tsx — which hands every design this prop set.
//
// Note what is NOT here: the template object. A design receives the four values
// it actually draws, already resolved on the server. That is the whole point of
// the split — the config never crosses into the browser, only the values that
// are visibly on screen.
//
// To add a cover: build a component with these props and register it in
// src/templates/covers.ts under its template.

export type CoverDesignProps = {
  /** Loader has handed off → begin the entrance choreography. */
  active: boolean;
  /** The engine has started teardown → play the exit animation. */
  hiding: boolean;
  /** Call when the user taps this design's open control. */
  onEnter: () => void;

  /** Copy, resolved server-side. */
  eyebrow: string;
  button: string;
  coupleNames: string;
  /** Fully-resolved image URL (already namespaced to this template). */
  image: string;
};

export type CoverDesignComponent = React.ComponentType<CoverDesignProps>;

/** Everything the server hands the cover engine — copy and art, nothing else.
 *  Note the absence of `templateSlug` and `design`: the SERVER resolves which
 *  design component to use (Shell.tsx), so the browser never needs to know
 *  either — and only the ACTIVE cover reaches the bundle. */
export type CoverData = {
  eyebrow: string;
  button: string;
  coupleNames: string;
  image: string;
};
