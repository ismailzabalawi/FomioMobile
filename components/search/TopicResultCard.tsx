import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import { formatTimeAgo } from '@/lib/utils/time';
import type { Byte } from '@/types/byte';

interface TopicResultCardProps {
  byte: Byte;
  onPress?: () => void;
}

export function TopicResultCard({ byte, onPress }: TopicResultCardProps) {
  const { isDark, isAmoled } = useTheme();
  const tokens = useMemo(
    () => getTokens(isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'),
    [isAmoled, isDark]
  );

  const snippet = useMemo(() => {
    const source = byte.excerpt || byte.cooked || '';
    return stripHtmlToText(source);
  }, [byte.cooked, byte.excerpt]);

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
      accessibilityLabel={byte.title || 'Search result'}
    >
      <View style={{ gap: 8 }}>
        <Text
          style={{
            color: tokens.colors.text,
            fontSize: 16,
            fontWeight: '700',
          }}
          numberOfLines={2}
        >
          {byte.title || 'Untitled'}
        </Text>

        {!!snippet && (
          <Text
            style={{
              color: tokens.colors.muted,
              fontSize: 14,
              lineHeight: 20,
            }}
            numberOfLines={3}
          >
            {snippet}
          </Text>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {byte.hub?.name && (
              <Text
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: tokens.radii.pill,
                  fontSize: 12,
                  fontWeight: '600',
                  backgroundColor: byte.hub.color || tokens.colors.accent,
                  color: tokens.colors.onAccent,
                }}
              >
                {byte.hub.name}
              </Text>
            )}
            {byte.teret?.name && (
              <Text
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: tokens.radii.pill,
                  fontSize: 12,
                  fontWeight: '600',
                  backgroundColor: byte.teret.color || tokens.colors.accent,
                  color: tokens.colors.onAccent,
                }}
              >
                {byte.teret.name}
              </Text>
            )}
          </View>

          <Text
            style={{
              color: tokens.colors.muted,
              fontSize: 12,
              fontWeight: '500',
            }}
          >
            {formatTimeAgo(byte.createdAt)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text
            style={{
              color: tokens.colors.muted,
              fontSize: 12,
              fontWeight: '500',
            }}
            numberOfLines={1}
          >
            {byte.author.name || byte.author.username || 'Unknown'}
          </Text>
          <Text
            style={{
              color: tokens.colors.muted,
              fontSize: 12,
              fontWeight: '500',
            }}
          >
            {byte.stats.replies} repl{byte.stats.replies === 1 ? 'y' : 'ies'} · {byte.stats.likes} like{byte.stats.likes === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function stripHtmlToText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
