import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
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
  const { author, teret } = byte;

  const handleAvatarPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/profile/${author.username}`);
  }, [router, author.username]);

  const handleNamePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/profile/${author.username}`);
  }, [router, author.username]);

  const avatarSource = author.avatar ? { uri: author.avatar } : undefined;

  return (
    <View className="flex-row gap-3">
      <Pressable onPress={handleAvatarPress} hitSlop={8}>
        <Avatar
          source={avatarSource}
          size="md"
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
          <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
            @{author.username} · {formatTimeAgo(byte.createdAt)}
          </Text>
        </View>

        {teret && (
          <Text
            className="mt-0.5 self-start px-2 py-0.5 rounded-full text-xs text-white font-medium"
            style={{
              backgroundColor: teret.color || '#4A6CF7',
            }}
          >
            {teret.name}
          </Text>
        )}
      </View>
    </View>
  );
}

