import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Heart, ChatCircle, BookmarkSimple } from 'phosphor-react-native';
import { useByteCardTokens } from './useByteCardTokens';
import { createTextStyle } from '@/shared/design-system';
import type { UseByteCardActionsReturn } from './useByteCardActions';

export interface ByteCardActionTrayProps {
  isOpen: boolean;
  actions: UseByteCardActionsReturn;
}

function ByteCardActionTrayComponent({ isOpen, actions }: ByteCardActionTrayProps) {
  const { tokens, colors, spacing } = useByteCardTokens();

  const trayStyle = useMemo(() => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: spacing.sm,
    backgroundColor: tokens.colors.surfaceMuted,
    borderColor: tokens.colors.border,
    borderWidth: 1,
    borderRadius: tokens.radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  }), [spacing.sm, tokens.colors.surfaceMuted, tokens.colors.border, tokens.radii.md]);

  if (!isOpen) return null;

  return (
    <View style={trayStyle}>
      <Pressable
        onPress={actions.toggleLike}
        disabled={actions.loadingLike}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Like"
        accessibilityState={{ disabled: actions.loadingLike, selected: actions.isLiked }}
      >
        {actions.loadingLike ? (
          <ActivityIndicator size="small" color={colors.like} />
        ) : (
          <Heart
            size={20}
            weight={actions.isLiked ? 'fill' : 'regular'}
            color={actions.isLiked ? colors.like : colors.comment}
          />
        )}
        <Text style={createTextStyle('caption', colors.foreground)}>
          {actions.isLiked ? 'Liked' : 'Like'}
        </Text>
      </Pressable>

      <Pressable
        onPress={actions.onCommentPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Reply"
      >
        <ChatCircle size={20} weight="regular" color={colors.comment} />
        <Text style={createTextStyle('caption', colors.foreground)}>
          Reply
        </Text>
      </Pressable>

      <Pressable
        onPress={actions.toggleBookmark}
        disabled={actions.loadingBookmark}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Bookmark"
        accessibilityState={{ disabled: actions.loadingBookmark, selected: actions.isBookmarked }}
      >
        {actions.loadingBookmark ? (
          <ActivityIndicator size="small" color={colors.bookmark} />
        ) : (
          <BookmarkSimple
            size={20}
            weight={actions.isBookmarked ? 'fill' : 'regular'}
            color={actions.isBookmarked ? colors.bookmark : colors.comment}
          />
        )}
        <Text style={createTextStyle('caption', colors.foreground)}>
          {actions.isBookmarked ? 'Saved' : 'Save'}
        </Text>
      </Pressable>
    </View>
  );
}

const areTrayPropsEqual = (prev: ByteCardActionTrayProps, next: ByteCardActionTrayProps) => {
  return (
    prev.isOpen === next.isOpen &&
    prev.actions.isLiked === next.actions.isLiked &&
    prev.actions.isBookmarked === next.actions.isBookmarked &&
    prev.actions.loadingLike === next.actions.loadingLike &&
    prev.actions.loadingBookmark === next.actions.loadingBookmark &&
    prev.actions.toggleLike === next.actions.toggleLike &&
    prev.actions.toggleBookmark === next.actions.toggleBookmark &&
    prev.actions.onCommentPress === next.actions.onCommentPress
  );
};

export const ByteCardActionTray = memo(ByteCardActionTrayComponent, areTrayPropsEqual);
ByteCardActionTray.displayName = 'ByteCardActionTray';

