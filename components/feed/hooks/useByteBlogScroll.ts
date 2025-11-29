import { useRef, useCallback, useMemo, useEffect } from 'react';
import { FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useHeader } from '@/components/ui/header';
import { TopicData } from '@/shared/useTopic';

/**
 * Hook for managing scroll behavior in ByteBlogPage
 * Handles scroll position tracking, debouncing, and header integration
 */
export function useByteBlogScroll(topic: TopicData | null) {
  const flatListRef = useRef<FlatList>(null);
  const scrollOffsetRef = useRef<number>(0);
  const { registerScrollHandler } = useHeader();

  // Simple debounce utility
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  // Handle scroll to track position and read status
  // ✅ FIXED: Extract values synchronously before debouncing to prevent event pooling issues
  const handleScrollDebounced = useMemo(
    () =>
      debounce(
        (scrollData: {
          contentOffset: { x: number; y: number };
          contentSize: { width: number; height: number };
          layoutMeasurement: { width: number; height: number };
        }) => {
          const { contentOffset, contentSize, layoutMeasurement } = scrollData;
          const scrollHeight = contentSize.height - layoutMeasurement.height;
          if (scrollHeight > 0 && topic) {
            const scrollPercentage = contentOffset.y / scrollHeight;
            // If scrolled near bottom (80%), Discourse will track read position automatically
            // via track_visit=1 parameter in getTopic calls
            // No explicit API call needed - Discourse tracks this on topic view
          }
        },
        1000
      ),
    [debounce, topic]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // ✅ FIXED: Extract values synchronously before debouncing
      // This prevents "Cannot read property 'contentOffset' of null" error
      // React Native events are pooled and may be null when accessed asynchronously
      if (!event?.nativeEvent) {
        return; // Safety check
      }

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

      // Store scroll position immediately (synchronous)
      scrollOffsetRef.current = contentOffset.y;

      // Pass extracted values to debounced function, not the event object
      handleScrollDebounced({
        contentOffset,
        contentSize,
        layoutMeasurement,
      });
    },
    [handleScrollDebounced]
  );

  // Header-aware scroll handler that also updates header scroll state
  // Header scroll state updates immediately, but read tracking is debounced
  const { onScroll: headerAwareScroll, unregister: unregisterHeaderScroll } = useMemo(
    () => registerScrollHandler(handleScroll, {
      debounce: 1000, // Debounce read tracking, but header state updates immediately
    }),
    [registerScrollHandler, handleScroll]
  );

  useEffect(() => {
    return () => {
      unregisterHeaderScroll();
    };
  }, [unregisterHeaderScroll]);

  // Handle scrollToIndex failures safely
  const handleScrollToIndexFailed = useCallback(
    (info: {
      index: number;
      highestMeasuredFrameIndex: number;
      averageItemLength: number;
    }) => {
      // Calculate approximate offset based on average item length
      const offset = info.index * info.averageItemLength;
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: Math.max(0, offset),
          animated: true,
        });
      }, 100);
    },
    []
  );

  return {
    flatListRef,
    scrollOffsetRef,
    onScroll: headerAwareScroll,
    handleScrollToIndexFailed,
  };
}

