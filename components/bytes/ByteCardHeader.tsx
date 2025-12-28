import React, { useCallback, memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCircle, CaretRight } from 'phosphor-react-native';
import { Avatar } from '../ui/avatar';
import { formatTimeAgo } from '@/lib/utils/time';
import { goToProfile } from '@/shared/navigation/profile';
import { useByteCardTokens } from './useByteCardTokens';
import { createTextStyle } from '@/shared/design-system';
import { BORDER_RADIUS } from '@/shared/theme-constants';
import type { Byte } from '@/types/byte';

export interface ByteCardHeaderProps {
  byte: Byte;
  onHeaderPress?: () => void; // Callback to notify parent that header area was pressed
}

/**
 * ByteCardHeader - Author identity + metadata + teret badge
 * 
 * UI Spec:
 * - Avatar: 42px (between md and lg), tappable to profile
 * - Name + username + timestamp in one row (wraps on small screens)
 * - Teret badge: colored pill below metadata (if exists)
 * - Spacing: 3px gap between avatar and content
 */
function ByteCardHeaderComponent({ byte, onHeaderPress }: ByteCardHeaderProps) {
  const { author } = byte;
  const { tokens, colors, spacing } = useByteCardTokens();

  const handleAvatarPress = useCallback((e?: unknown) => {
    // Notify parent that header handled the press (prevents parent Pressable from firing)
    // Call this FIRST before navigation to ensure parent doesn't handle the event
    if (onHeaderPress) {
      onHeaderPress();
    }
    goToProfile(author.username);
  }, [author.username, onHeaderPress]);

  const handleNamePress = useCallback((e?: unknown) => {
    // Notify parent that header handled the press (prevents parent Pressable from firing)
    // Call this FIRST before navigation to ensure parent doesn't handle the event
    if (onHeaderPress) {
      onHeaderPress();
    }
    goToProfile(author.username);
  }, [author.username, onHeaderPress]);

  const avatarSource = author.avatar ? { uri: author.avatar } : undefined;

  // Check if user is verified/admin/moderator
  const isVerified = author.verified || false;
  const isAdmin = author.admin || false;
  const isModerator = author.moderator || false;

  // Determine badge color using theme tokens
  const badgeColor = isAdmin
    ? colors.destructive // Red for admin
    : isModerator
    ? tokens.colors.accent // Use accent for moderator
    : colors.accent; // Blue/accent for verified

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
      <Pressable onPress={author.username ? handleAvatarPress : undefined} hitSlop={8}>
        <Avatar
          source={avatarSource}
          size="sm"
          fallback={author.name || author.username}
        />
      </Pressable>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 0 }}>
            <Pressable onPress={author.username ? handleNamePress : undefined} hitSlop={4}>
              <Text style={createTextStyle('body', colors.foreground)}>
                {author.name || author.username}
              </Text>
            </Pressable>
            {(isVerified || isAdmin || isModerator) && (
              <CheckCircle size={16} weight="fill" color={badgeColor} />
            )}
            <CaretRight size={14} weight="bold" color={colors.mutedForeground} />
          </View>

          {(byte.hub || byte.teret) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
              {byte.hub?.name && (
                <Text
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs / 2,
                    borderRadius: BORDER_RADIUS.full,
                    fontSize: 12,
                    fontWeight: '500',
                    backgroundColor: byte.hub.color || colors.mutedForeground,
                    color: '#ffffff',
                  }}
                >
                  {byte.hub.name}
                </Text>
              )}
              {byte.teret?.name && (
                <Text
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs / 2,
                    borderRadius: BORDER_RADIUS.full,
                    fontSize: 12,
                    fontWeight: '500',
                    backgroundColor: byte.teret.color || colors.accent,
                    color: '#ffffff',
                  }}
                >
                  {byte.teret.name}
                </Text>
              )}
            </View>
          )}
        </View>

        <Text style={[createTextStyle('caption', colors.mutedForeground), { marginTop: spacing.xs }]}>
          {formatTimeAgo(byte.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const areHeaderPropsEqual = (prev: ByteCardHeaderProps, next: ByteCardHeaderProps) => {
  return (
    prev.byte.id === next.byte.id &&
    prev.byte.author?.username === next.byte.author?.username &&
    prev.byte.hub?.id === next.byte.hub?.id &&
    prev.byte.teret?.id === next.byte.teret?.id &&
    prev.onHeaderPress === next.onHeaderPress
  );
};

export const ByteCardHeader = memo(ByteCardHeaderComponent, areHeaderPropsEqual);
ByteCardHeader.displayName = 'ByteCardHeader';
