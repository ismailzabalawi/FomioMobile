import React from 'react';
import { View } from 'react-native';
import { MarkdownContent } from '../feed/MarkdownContent';
import type { Byte } from '@/types/byte';

/**
 * ByteCardContent - Renders Discourse cooked HTML as markdown
 * 
 * UI Spec:
 * - Uses existing MarkdownContent component (HTML → Markdown conversion)
 * - Spacing: mt-2 from header
 * - Themed: inherits markdown styles from MarkdownContent
 * - No edge-to-edge: proper padding handled by MarkdownContent
 */
export function ByteCardContent({ byte }: { byte: Byte }) {
  return (
    <View className="mt-2">
      <MarkdownContent content={byte.cooked} />
    </View>
  );
}

