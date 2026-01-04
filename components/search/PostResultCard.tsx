import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import type { Comment } from '@/shared/discourseApi';

interface PostResultCardProps {
  comment: Comment;
  onPress?: () => void;
}

export function PostResultCard({ comment, onPress }: PostResultCardProps) {
  const { isDark, isAmoled } = useTheme();
  const tokens = useMemo(
    () => getTokens(isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'),
    [isAmoled, isDark]
  );

  const authorName = comment.author?.name || comment.author?.username || 'Unknown';
  const title = comment.byteTitle || 'Reply';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        {
          padding: 16,
          backgroundColor: tokens.colors.surfaceFrost,
          borderColor: tokens.colors.border,
          borderWidth: 1,
          borderRadius: tokens.radii.lg,
        },
        tokens.shadows.soft,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text
        style={{
          color: tokens.colors.text,
          fontSize: 15,
          fontWeight: '700',
        }}
        numberOfLines={2}
      >
        {title}
      </Text>

      {!!comment.content && (
        <Text
          style={{
            color: tokens.colors.muted,
            fontSize: 13,
            lineHeight: 18,
            marginTop: 8,
          }}
          numberOfLines={3}
        >
          {comment.content}
        </Text>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <Text style={{ color: tokens.colors.muted, fontSize: 12, fontWeight: '500' }}>
          {authorName}
        </Text>
        <Text style={{ color: tokens.colors.muted, fontSize: 12, fontWeight: '500' }}>
          {comment.likeCount || 0} like{comment.likeCount === 1 ? '' : 's'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
