"use client";

import { createContext, useContext, useState, useCallback } from "react";

type CoverContextType = {
  entered: boolean;
  onEnter: () => void;
  audioReady: boolean;
  setAudioReady: (ready: boolean) => void;
  // True once LoadingScreen has finished preloading all assets (success OR
  // the 10s-timeout path) and handed off to the static cover. Decoupled
  // from audioReady on purpose — audioReady stays false when the BGM fails
  // to preload, exactly the weak devices that most need the ripple warm-up.
  loadingComplete: boolean;
  setLoadingComplete: (done: boolean) => void;
};

const CoverContext = createContext<CoverContextType>({
  entered: false,
  onEnter: () => {},
  audioReady: false,
  setAudioReady: () => {},
  loadingComplete: false,
  setLoadingComplete: () => {},
});

export function CoverProvider({ children }: { children: React.ReactNode }) {
  const [entered, setEntered] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const onEnter = useCallback(() => setEntered(true), []);

  return (
    <CoverContext.Provider
      value={{
        entered,
        onEnter,
        audioReady,
        setAudioReady,
        loadingComplete,
        setLoadingComplete,
      }}
    >
      {children}
    </CoverContext.Provider>
  );
}

export function useCover() {
  return useContext(CoverContext);
}
