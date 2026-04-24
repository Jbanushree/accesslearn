import { createContext, useContext, useEffect, useState } from "react";

type AccessibilityState = {
  fontSize: number; // percentage, e.g. 100
  highContrast: boolean;
  reduceMotion: boolean;
};

type AccessibilityContextType = {
  state: AccessibilityState;
  updateState: (updates: Partial<AccessibilityState>) => void;
};

const initialState: AccessibilityState = {
  fontSize: 100,
  highContrast: false,
  reduceMotion: false,
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  state: initialState,
  updateState: () => null,
});

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(() => {
    const stored = localStorage.getItem("a11y-settings");
    return stored ? JSON.parse(stored) : initialState;
  });

  const updateState = (updates: Partial<AccessibilityState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem("a11y-settings", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty("--a11y-font-size", `${(state.fontSize / 100) * 16}px`);
    root.style.setProperty("--a11y-contrast", state.highContrast ? "contrast(1.2) saturate(1.1)" : "none");
    if (state.reduceMotion) {
      root.setAttribute("data-reduce-motion", "true");
    } else {
      root.removeAttribute("data-reduce-motion");
    }
  }, [state]);

  return (
    <AccessibilityContext.Provider value={{ state, updateState }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useAccessibility = () => useContext(AccessibilityContext);
