"use client";

import { Component, type ReactNode } from "react";

type Props = {
  /** Called once, the first time a render error is caught — used to latch
   *  rippleEnabled=false in the parent so the static fallback stays. */
  onError: () => void;
  /** Rendered in place of the children after an error is caught. Should be
   *  the static fallback so there is no blank frame before the parent
   *  re-renders with rippleEnabled=false. */
  fallback: ReactNode;
  children: ReactNode;
};

type State = { hasError: boolean };

/**
 * Catches runtime WebGL failures from the ripple scene that the
 * shouldEnableRipple() pre-flight probe cannot predict — context loss,
 * shader compile failure, GPU out-of-memory, or the lazy chunk failing
 * to load. On a catch it renders the static fallback immediately and
 * notifies the parent so the Timeline latches back to the static
 * decoration permanently for the session.
 */
export default class RippleErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  // Render-phase: swap to the fallback synchronously, so the broken
  // subtree is never re-rendered and no blank frame is shown.
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  // Commit-phase: notify the parent so it can latch rippleEnabled=false.
  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[RippleErrorBoundary] WebGL ripple failed — falling back to static:",
        error
      );
    }
    this.props.onError();
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
