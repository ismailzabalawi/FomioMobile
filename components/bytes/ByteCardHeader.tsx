import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCircle } from 'phosphor-react-native';
import { Avatar } from '../ui/avatar';
import { formatTimeAgo } from '@/lib/utils/time';
import { goToProfile } from '@/shared/navigation/profile';
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
export function ByteCardHeader({ byte, onHeaderPress }: ByteCardHeaderProps) {
  const { author } = byte;

  const handleAvatarPress = useCallback((e?: any) => {
    // Notify parent that header handled the press (prevents parent Pressable from firing)
    // Call this FIRST before navigation to ensure parent doesn't handle the event
    if (onHeaderPress) {
      onHeaderPress();
    }
    goToProfile(author.username);
  }, [author.username, onHeaderPress]);

  const handleNamePress = useCallback((e?: any) => {
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

  // Determine badge color
  const badgeColor = isAdmin
    ? '#FF6B6B' // Red for admin
    : isModerator
    ? '#4ECDC4' // Teal for moderator
    : '#4A6CF7'; // Blue for verified

  return (
    <View className="flex-row gap-3 items-center">
      <Pressable onPress={author.username ? handleAvatarPress : undefined} hitSlop={8}>
        <Avatar
          source={avatarSource}
          size="sm"
          fallback={author.name || author.username}
        />
      </Pressable>

      <View className="flex-1" style={{ minWidth: 0 }}>
        <View className="flex-row items-center gap-x-1 flex-wrap">
          <Pressable onPress={author.username ? handleNamePress : undefined} hitSlop={4}>
            <Text className="text-body font-semibold text-fomio-foreground dark:text-fomio-foreground-dark">
              {author.name || author.username}
            </Text>
          </Pressable>
          {(isVerified || isAdmin || isModerator) && (
            <CheckCircle size={16} weight="fill" color={badgeColor} />
          )}
          <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
            @{author.username} · {formatTimeAgo(byte.createdAt)}
          </Text>
        </View>

        {/* Show thread context if replying */}
        {byte.replyTo && (
          <Text className="text-xs text-fomio-muted dark:text-fomio-muted-dark mt-0.5">
            Replying to @{byte.replyTo.username}
          </Text>
        )}

        {/* Show repost context if reposted */}
        {byte.repostedBy && (
          <Text className="text-xs text-fomio-muted dark:text-fomio-muted-dark mt-0.5">
            Reposted by @{byte.repostedBy.username}
          </Text>
        )}
      </View>
    </View>
  );
}

