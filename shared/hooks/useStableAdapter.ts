import { useMemo } from 'react';
import type { Byte } from '@/types/byte';

/**
 * Stable adapter hook for performance optimization
 * Prevents unnecessary re-computation of adapter functions on every render
 * 
 * Usage:
 * ```tsx
 * const byte = useStableAdapter(topicSummaryToByte, item);
 * ```
 */
export function useStableAdapter<T>(
  adapterFn: (data: T) => Byte,
  data: T
): Byte {
  return useMemo(() => adapterFn(data), [adapterFn, data]);
}

