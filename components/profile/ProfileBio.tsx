// UI Spec: ProfileBio
// - Renders bio using MarkdownContent component
// - Collapsed after 3 lines with "Show more" button
// - Expands inline without screen reflow
// - Handles empty bio state

import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/components/theme';
import { MarkdownContent } from '../feed/MarkdownContent';

export interface ProfileBioProps {
  bio: string | undefined;
}

export function ProfileBio({ bio }: ProfileBioProps) {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!bio || bio.trim().length === 0) {
    return null;
  }

  // Simple check: if bio is short enough, don't show expand/collapse
  const shouldShowExpand = bio.length > 150; // Approximate 3 lines

  return (
    <View className="px-4 pb-4" style={{ width: '100%', overflow: 'hidden' }}>
      <View
        style={{
          maxHeight: isExpanded || !shouldShowExpand ? undefined : 60,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <MarkdownContent content={bio} isRawMarkdown={true} />
      </View>
      {shouldShowExpand && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          className="mt-2"
          accessible
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Show less' : 'Show more'}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: isDark ? '#3b82f6' : '#2563eb' }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

