import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MarkdownContent } from '../feed/MarkdownContent';
import { CaretDown, CaretUp } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import type { Byte } from '@/types/byte';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';

/**
 * ByteCardContent - Renders Discourse cooked HTML as markdown
 * 
 * UI Spec:
 * - Uses existing MarkdownContent component (HTML → Markdown conversion)
 * - Spacing: mt-2 from header
 * - Themed: inherits markdown styles from MarkdownContent
 * - No edge-to-edge: proper padding handled by MarkdownContent
 * - Note: Title is now rendered in ByteCard component above the header
 * - Preview mode: Shows truncated content with "Read more" link if content exceeds threshold
 */
export function ByteCardContent({ byte, isPreview = true }: { byte: Byte; isPreview?: boolean }) {
  const { themeMode, isDark } = useTheme();
  const colors = getThemeColors(themeMode, isDark);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const CONTENT_THRESHOLD = 350; // Characters
  const shouldTruncate = isPreview && byte.cooked && byte.cooked.length > CONTENT_THRESHOLD;
  const displayContent = shouldTruncate && !isExpanded 
    ? byte.cooked.substring(0, CONTENT_THRESHOLD).replace(/\s+\S*$/, '') + '...'
    : byte.cooked;

  const handleToggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsExpanded(!isExpanded);
  };

  return (
    <View className="mt-2">
      <MarkdownContent content={displayContent} />
      {shouldTruncate && (
        <TouchableOpacity
          onPress={handleToggleExpand}
          className="flex-row items-center mt-2"
          accessible
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Read less' : 'Read more'}
        >
          {isExpanded ? (
            <>
              <Text className="text-sm font-medium" style={{ color: colors.accent }}>
                Read less
              </Text>
              <CaretUp size={16} color={colors.accent} weight="regular" style={{ marginLeft: 4 }} />
            </>
          ) : (
            <>
              <Text className="text-sm font-medium" style={{ color: colors.accent }}>
                Read more
              </Text>
              <CaretDown size={16} color={colors.accent} weight="regular" style={{ marginLeft: 4 }} />
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

