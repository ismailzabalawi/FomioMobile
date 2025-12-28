// UI Spec: ProfileBio
// - Renders bio using MarkdownContent component
// - Collapsed after 3 lines with "Show more" button
// - Expands inline without screen reflow
// - Handles empty bio state with placeholder for own profile

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { MarkdownContent } from '../feed/MarkdownContent';
import { getTokens } from '@/shared/design/tokens';
import { PencilSimple } from 'phosphor-react-native';

export interface ProfileBioProps {
  bio: string | undefined;
  isOwnProfile?: boolean;
}

export function ProfileBio({ bio, isOwnProfile = false }: ProfileBioProps) {
  const { isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';
  const tokens = useMemo(() => getTokens(mode), [mode]);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddBio = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
      router.push('/(profile)/edit-profile' as any);
    } catch {
      // Silently ignore haptic errors
    }
  }, []);

  // Show placeholder for empty bio only on own profile
  if (!bio || bio.trim().length === 0) {
    if (!isOwnProfile) {
      return null;
    }

    const containerBackground = mode === 'dark' ? '#000000' : '#f8fafc';
    
    return (
      <View 
        className="px-4 pb-4" 
        style={{ 
          width: '100%',
          backgroundColor: containerBackground,
        }}
      >
        <TouchableOpacity
          onPress={handleAddBio}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Add a short bio"
          accessibilityHint="Navigate to edit profile screen to add a bio"
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 8,
          }}
        >
          <PencilSimple
            size={16}
            color={tokens.colors.muted}
            weight="regular"
          />
          <Text
            className="text-sm"
            style={{ color: tokens.colors.muted, flex: 1 }}
          >
            Add a short bio
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Simple check: if bio is short enough, don't show expand/collapse
  const shouldShowExpand = bio.length > 110; // Approximate 2 lines
  const containerBackground = mode === 'dark' ? '#000000' : '#f8fafc';

  return (
    <View 
      className="px-4 pb-2"
      style={{ 
        width: '100%',
        backgroundColor: containerBackground,
      }}
    >
      <View
        style={{
          maxHeight: isExpanded || !shouldShowExpand ? undefined : 40,
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
            style={{ color: tokens.colors.accent }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
