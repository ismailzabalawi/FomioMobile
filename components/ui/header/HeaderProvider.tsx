import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { AppHeaderProps } from '../AppHeader';

// Header state interface - all fields optional (overrides only)
export interface HeaderState {
  title?: string | ReactNode;
  subtitle?: string;
  canGoBack?: boolean;
  onBackPress?: () => void;
  leftNode?: ReactNode;
  rightActions?: ReactNode[];
  subHeader?: ReactNode;
  tone?: 'bg' | 'card' | 'transparent';
  elevated?: boolean;
  isScrolled?: boolean;
  withSafeTop?: boolean;
  enableHaptics?: boolean;
  progress?: number;
  centerTitle?: boolean;
  titleNumberOfLines?: number;
  subtitleNumberOfLines?: number;
  titleFontSize?: number;
  statusBarStyle?: 'light' | 'dark' | 'auto';
  extendToStatusBar?: boolean;
  scrollThreshold?: number;
}

// Default header values
const DEFAULT_HEADER_STATE: Required<Omit<HeaderState, 'title' | 'subtitle' | 'onBackPress' | 'leftNode' | 'rightActions' | 'subHeader' | 'progress'>> = {
  canGoBack: false,
  tone: 'card',
  elevated: false,
  isScrolled: false,
  withSafeTop: true,
  enableHaptics: true,
  centerTitle: false,
  titleNumberOfLines: 1,
  subtitleNumberOfLines: 1,
  titleFontSize: 22,
  statusBarStyle: 'auto',
  extendToStatusBar: true,
  scrollThreshold: 100, // HEADER_VISIBILITY_THRESHOLD from useScrollHeader.ts
};

// State context (read-only)
interface HeaderStateContextValue {
  header: HeaderState;
}

// Dispatch context (setters)
interface HeaderDispatchContextValue {
  setHeader: (partial: Partial<HeaderState>) => void;
  resetHeader: () => void;
  registerScrollHandler: (handler: (event: NativeSyntheticEvent<NativeScrollEvent>) => void) => () => void;
}

const HeaderStateContext = createContext<HeaderStateContextValue | undefined>(undefined);
const HeaderDispatchContext = createContext<HeaderDispatchContextValue | undefined>(undefined);

export interface HeaderProviderProps {
  children: ReactNode;
}

export function HeaderProvider({ children }: HeaderProviderProps) {
  const [headerState, setHeaderState] = useState<HeaderState>({});
  const [scrollHandlers, setScrollHandlers] = useState<Set<(event: NativeSyntheticEvent<NativeScrollEvent>) => void>>(new Set());

  // Merge partial state updates
  const setHeader = useCallback((partial: Partial<HeaderState>) => {
    setHeaderState((prev) => ({ ...prev, ...partial }));
  }, []);

  // Reset to empty state (will use defaults in GlobalHeader)
  const resetHeader = useCallback(() => {
    setHeaderState({});
  }, []);

  // Capture scrollThreshold value to prevent registerScrollHandler from being recreated
  // when headerState changes for unrelated properties (like rightActions)
  const scrollThresholdValue = headerState.scrollThreshold ?? DEFAULT_HEADER_STATE.scrollThreshold;

  // Register scroll handler and return unregister function
  const registerScrollHandler = useCallback(
    (handler: (event: NativeSyntheticEvent<NativeScrollEvent>) => void) => {
      // Create wrapped handler that updates isScrolled state
      // Use captured scrollThresholdValue instead of reading from headerState
      const wrappedHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const isScrolled = offsetY > scrollThresholdValue;
        
        // Update scroll state
        setHeaderState((prev) => {
          if (prev.isScrolled === isScrolled) return prev;
          return { ...prev, isScrolled };
        });
        
        // Call original handler
        handler(event);
      };

      setScrollHandlers((prev) => new Set(prev).add(wrappedHandler));

      // Return unregister function
      return () => {
        setScrollHandlers((prev) => {
          const next = new Set(prev);
          next.delete(wrappedHandler);
          return next;
        });
      };
    },
    [scrollThresholdValue]
  );

  // Memoize context values to prevent unnecessary re-renders
  const stateValue = useMemo(
    () => ({
      header: headerState,
    }),
    [headerState]
  );

  const dispatchValue = useMemo(
    () => ({
      setHeader,
      resetHeader,
      registerScrollHandler,
    }),
    [setHeader, resetHeader, registerScrollHandler]
  );

  return (
    <HeaderStateContext.Provider value={stateValue}>
      <HeaderDispatchContext.Provider value={dispatchValue}>
        {children}
      </HeaderDispatchContext.Provider>
    </HeaderStateContext.Provider>
  );
}

// Hooks to access contexts
export function useHeaderState() {
  const context = useContext(HeaderStateContext);
  if (context === undefined) {
    throw new Error('useHeaderState must be used within a HeaderProvider');
  }
  return context;
}

export function useHeaderDispatch() {
  const context = useContext(HeaderDispatchContext);
  if (context === undefined) {
    throw new Error('useHeaderDispatch must be used within a HeaderProvider');
  }
  return context;
}

