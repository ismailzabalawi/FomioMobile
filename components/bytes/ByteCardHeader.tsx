import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CheckCircle } from 'phosphor-react-native';
import { Avatar } from '../ui/avatar';
import { formatTimeAgo } from '@/lib/utils/time';
import type { Byte } from '@/types/byte';

/**
 * ByteCardHeader - Author identity + metadata + teret badge
 * 
 * UI Spec:
 * - Avatar: 42px (between md and lg), tappable to profile
 * - Name + username + timestamp in one row (wraps on small screens)
 * - Teret badge: colored pill below metadata (if exists)
 * - Spacing: 3px gap between avatar and content
 */
export function ByteCardHeader({ byte }: { byte: Byte }) {
  const router = useRouter();
  const { author } = byte;

  const handleAvatarPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/profile/${author.username}`);
  }, [router, author.username]);

  const handleNamePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/profile/${author.username}`);
  }, [router, author.username]);

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
      <Pressable onPress={handleAvatarPress} hitSlop={8}>
        <Avatar
          source={avatarSource}
          size="sm"
          fallback={author.name || author.username}
        />
      </Pressable>

      <View className="flex-1" style={{ minWidth: 0 }}>
        <View className="flex-row items-center gap-x-1 flex-wrap">
          <Pressable onPress={handleNamePress} hitSlop={4}>
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

