import { useMemo } from 'react';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { TopicData } from '@/shared/useTopic';
import { ShareButton } from '../ShareButton';
import { OverflowMenu } from '../OverflowMenu';
import { StatusChipsRow } from '../StatusChipsRow';

/**
 * Hook for managing header configuration in ByteBlogPage
 * Handles header actions, sub-header, and screen header setup
 */
export function useByteBlogHeader(
  topic: TopicData | null,
  isDark: boolean,
  onShare?: () => void,
  retry?: () => void
) {
  // Check if author has Staff badge
  const isStaff = useMemo(() => {
    return topic?.authorBadges?.some(badge => badge.name === 'Staff') || false;
  }, [topic]);

  // Configure header actions (share button and overflow menu)
  const headerActions = useMemo(() => {
    if (!topic) return undefined;
    return [
      <ShareButton 
        key="share" 
        title={topic.title || ''} 
        url={topic.url || ''} 
        onPress={onShare}
      />,
      <OverflowMenu 
        key="menu"
        topic={topic}
        onWatch={onShare}
        onMute={onShare}
        onPin={onShare}
        onClose={onShare}
        onShare={onShare}
        onRefresh={retry}
      />
    ];
  }, [topic, onShare, retry]);

  // Configure header sub-header (status chips)
  const headerSubHeader = useMemo(() => {
    if (!topic) return undefined;
    return (
      <StatusChipsRow
        isPinned={topic.isPinned}
        isLocked={topic.isClosed}
        isArchived={topic.isArchived}
        isStaff={isStaff}
      />
    );
  }, [topic, isStaff]);

  // Set up screen header
  useScreenHeader({
    title: topic?.title ?? "Byte",
    canGoBack: true,
    tone: "bg",
    withSafeTop: false,
    titleFontSize: 24,
    statusBarStyle: isDark ? 'light' : 'dark',
    extendToStatusBar: true,
    rightActions: headerActions,
    subHeader: headerSubHeader,
  }, [topic, isDark, isStaff, headerActions, headerSubHeader]);
}
