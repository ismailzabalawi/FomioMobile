import { ReactNode } from 'react';
import { useScreenHeader } from './useScreenHeader';
import { useTheme } from '@/components/theme';

export interface UseFeedHeaderOptions {
  /** Header title */
  title: string | ReactNode;
  /** Show back button (default: false for feed screens) */
  canGoBack?: boolean;
  /** Custom back handler */
  onBackPress?: () => void;
  /** Right-side actions */
  rightActions?: ReactNode[];
  /** Use compact header (default: true for feed screens) */
  compact?: boolean;
  /** Center the title/logo (default: true for feed) */
  centerTitle?: boolean;
}

/**
 * Hook for configuring headers on feed/list screens
 * - Uses "bg" tone (blends with page background)
 * - No safe top padding (header extends to top)
 * - Consistent styling for feed screens
 */
export function useFeedHeader({
  title,
  canGoBack = false,
  onBackPress,
  rightActions,
  compact = true,
  centerTitle = true,
}: UseFeedHeaderOptions) {
  const { isDark } = useTheme();

  useScreenHeader(
    {
      title,
      canGoBack,
      onBackPress,
      tone: 'bg',
      withSafeTop: false,
      extendToStatusBar: true,
      statusBarStyle: isDark ? 'light' : 'dark',
      rightActions,
      compact,
      centerTitle,
      titleFontSize: compact ? 20 : 22, // Slightly smaller title for compact mode
    },
    [title, canGoBack, onBackPress, isDark, rightActions, compact, centerTitle]
  );
}
