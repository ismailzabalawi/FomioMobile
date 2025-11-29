import React, { useMemo } from 'react';
import { useDetailHeader } from '@/shared/hooks/useDetailHeader';
import { TopicData } from '@/shared/useTopic';
import { OverflowMenu } from '../OverflowMenu';
import { StatusChipsRow } from '../StatusChipsRow';

/**
 * Hook for managing header configuration in ByteBlogPage
 * Handles header actions and screen header setup
 */
export function useByteBlogHeader(
  topic: TopicData | null,
  _isDark: boolean,
  onShare?: () => void,
  retry?: () => void
) {
  // Determine if author has Staff badge
  const isStaff = useMemo(() => {
    return topic?.authorBadges?.some((badge) => badge.name === 'Staff') ?? false;
  }, [topic]);

  // Status chips (replaces prior subheader; now sits in the right action area)
  const statusChips = useMemo(() => {
    if (!topic) return undefined;
    return (
      <StatusChipsRow
        key="status-chips"
        isPinned={topic.isPinned}
        isLocked={topic.isClosed}
        isArchived={topic.isArchived}
        isStaff={isStaff}
      />
    );
  }, [topic, isStaff]);

  // Configure header actions (status chips + overflow menu)
  const headerActions = useMemo(() => {
    if (!topic) return undefined;
    const actions: React.ReactNode[] = [];
    if (statusChips) {
      actions.push(statusChips);
    }
    actions.push(
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
    );
    return actions;
  }, [topic, statusChips, onShare, retry]);

  // Set up screen header using detail header preset
  useDetailHeader({
    title: topic?.title ?? "Byte",
    rightActions: headerActions,
  });
}
