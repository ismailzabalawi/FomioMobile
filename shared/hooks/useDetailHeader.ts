import { ReactNode } from 'react';
import { useScreenHeader } from './useScreenHeader';
import { useTheme } from '@/components/theme';

export interface UseDetailHeaderOptions {
  /** Header title */
  title: string;
  /** Right-side actions (e.g., share, overflow menu) */
  rightActions?: ReactNode[];
  /** Custom back handler */
  onBackPress?: () => void;
  /** Title font size (default: 20 for compact detail screens) */
  titleFontSize?: number;
  /** Use transparent backdrop for overlay effect (default: false) */
  transparent?: boolean;
  /** Transparent backdrop variant */
  transparentBackdrop?: 'blur' | 'gradient' | 'none';
  /** Use compact header (default: true) */
  compact?: boolean;
}

/**
 * Hook for configuring headers on detail/view screens
 * - Uses "bg" tone (or "transparent" for overlays)
 * - Larger title font size (24px default)
 * - Back button enabled
 * - Status bar coordination
 * - Supports transparent overlay with blur/gradient
 */
export function useDetailHeader({
  title,
  rightActions,
  onBackPress,
  titleFontSize,
  transparent = false,
  transparentBackdrop = 'blur',
  compact = true,
}: UseDetailHeaderOptions) {
  const { isDark } = useTheme();

  const tone = transparent ? 'transparent' : 'bg';
  // Use smaller font size for compact mode
  const resolvedTitleFontSize = titleFontSize ?? (compact ? 20 : 24);

  useScreenHeader(
    {
      title,
      canGoBack: true,
      onBackPress,
      tone,
      withSafeTop: false,
      extendToStatusBar: true,
      titleFontSize: resolvedTitleFontSize,
      statusBarStyle: isDark ? 'light' : 'dark',
      rightActions,
      transparentBackdrop: transparent ? transparentBackdrop : undefined,
      compact,
    },
    [title, onBackPress, tone, resolvedTitleFontSize, isDark, rightActions, transparent, transparentBackdrop, compact]
  );
}

