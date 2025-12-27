import React, { useState, memo, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MarkdownContent } from '../feed/MarkdownContent';
import { CaretDown, CaretUp } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { Byte } from '@/types/byte';
import { useByteCardTokens } from './useByteCardTokens';
import { createTextStyle } from '@/shared/design-system';

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
function ByteCardContentComponent({ byte, isPreview = true }: { byte: Byte; isPreview?: boolean }) {
  const { tokens, colors, spacing } = useByteCardTokens();
  const [isExpanded, setIsExpanded] = useState(false);
  const plainExcerpt = useMemo(() => stripHtmlToText(byte.excerpt || ''), [byte.excerpt]);
  const shouldUsePlainPreview = isPreview && byte.origin === 'summary' && plainExcerpt.length > 0;
  
  const CONTENT_THRESHOLD = 350; // Characters
  const cookedContent = byte.cooked || '';
  const shouldTruncate = isPreview && cookedContent.length > CONTENT_THRESHOLD;
  const displayContent = shouldTruncate && !isExpanded 
    ? cookedContent.substring(0, CONTENT_THRESHOLD).replace(/\s+\S*$/, '') + '...'
    : cookedContent;

  const handleToggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsExpanded(!isExpanded);
  };

  const showFade = shouldTruncate && !isExpanded;

  if (shouldUsePlainPreview) {
    return (
      <View style={{ marginTop: spacing.sm }}>
        <Text
          style={[createTextStyle('body', colors.foreground), { lineHeight: 22 }]}
          numberOfLines={6}
        >
          {plainExcerpt}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: spacing.sm }}>
      <View style={{ position: 'relative', paddingBottom: showFade ? 36 : 0 }}>
        <MarkdownContent content={displayContent} />

        {showFade && (
          <>
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', tokens.colors.surfaceFrost]}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 32,
                height: 72,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: tokens.colors.surfaceFrost,
                paddingTop: spacing.sm,
              }}
            >
              <TouchableOpacity
                onPress={handleToggleExpand}
                style={{ flexDirection: 'row', alignItems: 'center' }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={isExpanded ? 'Read less' : 'Read more'}
              >
                <Text style={[createTextStyle('caption', colors.accent), { fontWeight: '500' }]}>
                  Read more
                </Text>
                <CaretDown size={16} color={colors.accent} weight="regular" style={{ marginLeft: spacing.xs }} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {shouldTruncate && isExpanded && (
        <TouchableOpacity
          onPress={handleToggleExpand}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Read less"
        >
          <Text style={[createTextStyle('caption', colors.accent), { fontWeight: '500' }]}>
            Read less
          </Text>
          <CaretUp size={16} color={colors.accent} weight="regular" style={{ marginLeft: spacing.xs }} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// Memoize ByteCardContent to prevent unnecessary re-renders when byte props haven't changed
export const ByteCardContent = memo(ByteCardContentComponent, (prevProps, nextProps) => {
  return (
    prevProps.byte.id === nextProps.byte.id &&
    prevProps.byte.cooked === nextProps.byte.cooked &&
    prevProps.byte.excerpt === nextProps.byte.excerpt &&
    prevProps.isPreview === nextProps.isPreview
  );
});
ByteCardContent.displayName = 'ByteCardContent';

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
