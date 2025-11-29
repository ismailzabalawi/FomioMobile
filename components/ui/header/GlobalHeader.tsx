import React, { useMemo } from 'react';
import { AppHeader, AppHeaderProps, APP_HEADER_DEFAULTS } from '../AppHeader';
import { useHeaderState } from './HeaderProvider';

const DEFAULT_HEADER_STATE: Required<
  Omit<
    AppHeaderProps,
    | 'title'
    | 'subtitle'
    | 'onBackPress'
    | 'leftNode'
    | 'rightActions'
    | 'progress'
    | 'iconColor'
    | 'testID'
  >
> = APP_HEADER_DEFAULTS;

export function GlobalHeader() {
  const { header } = useHeaderState();

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
      largeTitle: header.largeTitle ?? DEFAULT_HEADER_STATE.largeTitle,
      iconColor: header.iconColor,
      transparentBackdrop: header.transparentBackdrop ?? DEFAULT_HEADER_STATE.transparentBackdrop,
      testID: 'global-header',
    };
  }, [header]);

  // Don't render if no title is set
  if (!header.title) {
    return null;
  }

  return <AppHeader {...resolvedProps} />;
}
