import React, { useMemo } from 'react';
import { AppHeader, AppHeaderProps } from '../AppHeader';
import { useHeaderState } from './HeaderProvider';
import { getThemeColors } from '@/shared/theme-constants';
import { useTheme } from '@/components/theme';

// Default header values matching AppHeader defaults
const DEFAULT_HEADER_STATE: Required<Omit<AppHeaderProps, 'title' | 'subtitle' | 'onBackPress' | 'leftNode' | 'rightActions' | 'subHeader' | 'progress' | 'testID'>> = {
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
  extendToStatusBar: false, // Header starts after status bar, doesn't extend into it
};

export function GlobalHeader() {
  const { header } = useHeaderState();
  const { themeMode, isDark } = useTheme();

  // Memoize theme colors (single call per theme change)
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

  // Merge header state with defaults
  const resolvedProps: AppHeaderProps = useMemo(() => {
    // If no title is set, don't render header
    if (!header.title) {
      return { title: '', ...DEFAULT_HEADER_STATE };
    }

    return {
      title: header.title,
      subtitle: header.subtitle,
      canGoBack: header.canGoBack ?? DEFAULT_HEADER_STATE.canGoBack,
      onBackPress: header.onBackPress,
      leftNode: header.leftNode,
      rightActions: header.rightActions,
      subHeader: header.subHeader,
      tone: header.tone ?? DEFAULT_HEADER_STATE.tone,
      elevated: header.elevated ?? DEFAULT_HEADER_STATE.elevated,
      isScrolled: header.isScrolled ?? DEFAULT_HEADER_STATE.isScrolled,
      withSafeTop: header.withSafeTop ?? DEFAULT_HEADER_STATE.withSafeTop,
      enableHaptics: header.enableHaptics ?? DEFAULT_HEADER_STATE.enableHaptics,
      progress: header.progress,
      centerTitle: header.centerTitle ?? DEFAULT_HEADER_STATE.centerTitle,
      titleNumberOfLines: header.titleNumberOfLines ?? DEFAULT_HEADER_STATE.titleNumberOfLines,
      subtitleNumberOfLines: header.subtitleNumberOfLines ?? DEFAULT_HEADER_STATE.subtitleNumberOfLines,
      titleFontSize: header.titleFontSize ?? DEFAULT_HEADER_STATE.titleFontSize,
      statusBarStyle: header.statusBarStyle ?? DEFAULT_HEADER_STATE.statusBarStyle,
      extendToStatusBar: header.extendToStatusBar ?? DEFAULT_HEADER_STATE.extendToStatusBar,
      testID: 'global-header',
    };
  }, [header]);

  // Don't render if no title is set
  if (!header.title) {
    return null;
  }

  return <AppHeader {...resolvedProps} />;
}

