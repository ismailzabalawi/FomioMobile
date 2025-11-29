import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { APP_HEADER_DEFAULTS } from '../AppHeader';

// Header state interface - all fields optional (overrides only)
export interface HeaderState {
  title?: string | ReactNode;
  subtitle?: string;
  canGoBack?: boolean;
  onBackPress?: () => void;
  leftNode?: ReactNode;
  rightActions?: ReactNode[];
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
  largeTitle?: boolean;
  headerHeight?: number;
  iconColor?: string;
  transparentBackdrop?: 'blur' | 'gradient' | 'none';
  compact?: boolean;
}

// Scroll handler options
export interface ScrollHandlerOptions {
  /** Throttle delay in ms (limits how often handler is called) */
  throttle?: number;
  /** Debounce delay in ms (delays handler until scroll stops) */
  debounce?: number;
  /** Custom scroll threshold (overrides header scrollThreshold) */
  threshold?: number;
}

// Default header values
const DEFAULT_HEADER_STATE: Required<
  Omit<HeaderState, 'title' | 'subtitle' | 'onBackPress' | 'leftNode' | 'rightActions' | 'progress' | 'headerHeight' | 'iconColor'>
> = {
  ...APP_HEADER_DEFAULTS,
  scrollThreshold: 24, // Quick settle like X/Twitter when nudging the feed
};

// State context (read-only)
interface HeaderStateContextValue {
  header: HeaderState;
}

// Dispatch context (setters)
interface HeaderDispatchContextValue {
  setHeader: (partial: Partial<HeaderState>) => void;
  resetHeader: () => void;
  setMeasuredHeight: (height: number) => void;
  registerScrollHandler: (
    handler: (event: NativeSyntheticEvent<NativeScrollEvent>) => void,
    options?: ScrollHandlerOptions
  ) => { onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void; unregister: () => void };
}

const HeaderStateContext = createContext<HeaderStateContextValue | undefined>(undefined);
const HeaderDispatchContext = createContext<HeaderDispatchContextValue | undefined>(undefined);

export interface HeaderProviderProps {
  children: ReactNode;
}

export function HeaderProvider({ children }: HeaderProviderProps) {
  const [headerState, setHeaderState] = useState<HeaderState>({});

  // Merge partial state updates
  const setHeader = useCallback((partial: Partial<HeaderState>) => {
    setHeaderState((prev) => ({ ...prev, ...partial }));
  }, []);

  // Reset to empty state (will use defaults in GlobalHeader)
  const resetHeader = useCallback(() => {
    setHeaderState({});
  }, []);

  // Register scroll handler with throttling/debouncing support
  const registerScrollHandler = useCallback(
    (
      handler: (event: NativeSyntheticEvent<NativeScrollEvent>) => void,
      options?: ScrollHandlerOptions
    ) => {
      let isRegistered = true;
      let lastCallTime = 0;
      let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
      
      const scrollThreshold = options?.threshold ?? (headerState.scrollThreshold ?? DEFAULT_HEADER_STATE.scrollThreshold);
      const throttleDelay = options?.throttle;
      const debounceDelay = options?.debounce;

      // Create wrapped handler that updates isScrolled state and calls the original handler
      const wrappedHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!isRegistered) return;

        // ✅ FIXED: Extract nativeEvent data synchronously before any async operations
        // React Native pools synthetic events for performance, so we must copy the data
        // before passing to setTimeout/debounce, otherwise event.nativeEvent will be nullified
        const nativeEventData = event.nativeEvent;
        const extractedEvent = {
          nativeEvent: {
            contentOffset: { ...nativeEventData.contentOffset },
            contentSize: { ...nativeEventData.contentSize },
            layoutMeasurement: { ...nativeEventData.layoutMeasurement },
            zoomScale: nativeEventData.zoomScale,
            contentInset: nativeEventData.contentInset ? { ...nativeEventData.contentInset } : undefined,
          },
        } as NativeSyntheticEvent<NativeScrollEvent>;

        const offsetY = nativeEventData.contentOffset.y;
        const isScrolled = offsetY > scrollThreshold;

        // Update scroll state immediately (not throttled/debounced for responsive UI)
        setHeaderState((prev) => {
          if (prev.isScrolled === isScrolled) return prev;
          return { ...prev, isScrolled };
        });

        // Apply throttling/debouncing to the user's handler
        const executeHandler = () => {
          if (!isRegistered) return;
          handler(extractedEvent);
        };

        if (debounceDelay) {
          // Debounce: delay execution until scroll stops
          if (debounceTimeout) {
            clearTimeout(debounceTimeout);
          }
          debounceTimeout = setTimeout(executeHandler, debounceDelay);
        } else if (throttleDelay) {
          // Throttle: limit execution frequency
          const now = Date.now();
          if (now - lastCallTime >= throttleDelay) {
            lastCallTime = now;
            executeHandler();
          }
        } else {
          // No throttling/debouncing: execute immediately
          executeHandler();
        }
      };

      return {
        onScroll: wrappedHandler,
        unregister: () => {
          isRegistered = false;
          if (debounceTimeout) {
            clearTimeout(debounceTimeout);
          }
        },
      };
    },
    [headerState.scrollThreshold]
  );

  const setMeasuredHeight = useCallback((height: number) => {
    setHeaderState((prev) => {
      if (prev.headerHeight === height) return prev;
      return { ...prev, headerHeight: height };
    });
  }, []);

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
      setMeasuredHeight,
    }),
    [setHeader, resetHeader, registerScrollHandler, setMeasuredHeight]
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
