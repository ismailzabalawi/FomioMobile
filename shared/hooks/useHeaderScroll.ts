import { useCallback, useMemo, useEffect } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useHeader, ScrollHandlerOptions } from '@/components/ui/header';

export interface UseHeaderScrollOptions extends ScrollHandlerOptions {
  /** Custom scroll handler (optional - can use returned onScroll directly) */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/**
 * Hook for easy scroll integration with header
 * - Automatically registers/unregisters scroll handler
 * - Supports throttling/debouncing
 * - Returns onScroll handler and isScrolled state
 * - Cleans up on unmount
 */
export function useHeaderScroll(options: UseHeaderScrollOptions = {}) {
  const { registerScrollHandler, isScrolled } = useHeader();
  const { onScroll: customOnScroll, throttle, debounce, threshold } = options;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (customOnScroll) {
        customOnScroll(event);
      }
    },
    [customOnScroll]
  );

  const { onScroll, unregister } = useMemo(
    () =>
      registerScrollHandler(handleScroll, {
        throttle,
        debounce,
        threshold,
      }),
    [registerScrollHandler, handleScroll, throttle, debounce, threshold]
  );

  useEffect(() => {
    return () => {
      unregister();
    };
  }, [unregister]);

  return {
    onScroll,
    isScrolled,
  };
}

