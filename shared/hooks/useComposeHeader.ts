import { ReactNode } from 'react';
import { useScreenHeader } from './useScreenHeader';
import { useScreenBackBehavior } from './useScreenBackBehavior';
import { useTheme } from '@/components/theme';

export interface UseComposeHeaderOptions {
  /** Header title (default: "Create Byte") */
  title?: string;
  /** Right-side actions (e.g., mode toggle, help) */
  rightActions?: ReactNode[];
  /** Custom back handler (for cancel/discard logic) */
  onBackPress?: () => void;
  /** Custom cancel handler (alias for onBackPress) */
  onCancel?: () => void;
  /** Use compact header (default: true) */
  compact?: boolean;
}

/**
 * Hook for configuring headers on compose/create screens
 * - Uses "card" tone (surfaced, elevated)
 * - Back button enabled with custom cancel behavior
 * - No safe top padding
 * - Consistent styling for creation flows
 */
export function useComposeHeader({
  title = 'Create Byte',
  rightActions,
  onBackPress,
  onCancel,
  compact = true,
}: UseComposeHeaderOptions) {
  const { isDark } = useTheme();

  // Use onCancel if provided, otherwise onBackPress
  const handleBack = onCancel || onBackPress;

  useScreenHeader(
    {
      title,
      canGoBack: true,
      onBackPress: handleBack,
      tone: 'card',
      withSafeTop: false,
      extendToStatusBar: true,
      statusBarStyle: isDark ? 'light' : 'dark',
      rightActions,
      compact,
      titleFontSize: compact ? 20 : 22,
    },
    [title, handleBack, isDark, rightActions, compact]
  );

  // Set up back behavior for compose screens (handles discard confirmation, etc.)
  useScreenBackBehavior(
    {
      onBackPress: handleBack,
    },
    [handleBack]
  );
}

