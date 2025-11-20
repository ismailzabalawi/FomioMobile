// Hook to track scroll position for dynamic blurred header
// Returns scroll offset and whether header should be visible

import { useState, useCallback } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

const HEADER_VISIBILITY_THRESHOLD = 100; // Show header after scrolling past this point

export interface UseScrollHeaderReturn {
  scrollY: number;
  isHeaderVisible: boolean;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function useScrollHeader(): UseScrollHeaderReturn {
  const [scrollY, setScrollY] = useState(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      setScrollY(offsetY);
    },
    []
  );

  const isHeaderVisible = scrollY > HEADER_VISIBILITY_THRESHOLD;

  return {
    scrollY,
    isHeaderVisible,
    onScroll,
  };
}

