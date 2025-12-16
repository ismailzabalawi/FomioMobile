import React, { createContext, useContext, useMemo, useRef, useCallback } from 'react';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

type FluidNavContextValue = {
  scrollY: SharedValue<number>;
  setUpHandler: (handler: (() => void) | null) => void;
  triggerUp: () => void;
};

const FluidNavContext = createContext<FluidNavContextValue | null>(null);

export function FluidNavProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const scrollY = useSharedValue(0);
  const upHandlerRef = useRef<(() => void) | null>(null);

  const setUpHandler = useCallback((handler: (() => void) | null) => {
    upHandlerRef.current = handler;
  }, []);

  const triggerUp = useCallback(() => {
    console.log('[FluidNav] triggerUp called, handler exists:', !!upHandlerRef.current);
    if (upHandlerRef.current) {
      console.log('[FluidNav] Executing scroll-to-top handler');
      upHandlerRef.current();
    } else {
      console.warn('[FluidNav] No handler registered! Current handler ref:', upHandlerRef.current);
    }
  }, []);

  const value = useMemo(
    () => ({
      scrollY,
      setUpHandler,
      triggerUp,
    }),
    [scrollY, setUpHandler, triggerUp]
  );

  return (
    <FluidNavContext.Provider value={value}>
      {children}
    </FluidNavContext.Provider>
  );
}

export function useFluidNav(): FluidNavContextValue {
  const ctx = useContext(FluidNavContext);
  if (!ctx) {
    throw new Error('useFluidNav must be used within a FluidNavProvider');
  }
  return ctx;
}
