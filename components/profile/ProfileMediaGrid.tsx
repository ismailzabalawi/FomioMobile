// UI Spec: ProfileMediaGrid
// - 3-column grid layout
// - Rounded corners
// - Lazy-loaded images using expo-image
// - On tap → fullscreen viewer (future: implement lightbox)
// - Empty state: "No media yet"
// - Extracts images from user posts

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';

export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  postId?: number;
}

export interface ProfileMediaGridProps {
  media: MediaItem[];
  isLoading?: boolean;
  onMediaPress?: (media: MediaItem, index: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 16;
const GAP = 4;
const COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

export function ProfileMediaGrid({
  media,
  isLoading = false,
  onMediaPress,
}: ProfileMediaGridProps) {
  const { isDark, isAmoled } = useTheme();

  const handlePress = useCallback(
    (item: MediaItem, index: number) => {
      if (onMediaPress) {
        onMediaPress(item, index);
      } else {
        // Default: log for now, future: open lightbox
        console.log('Media tapped:', item.url);
      }
    },
    [onMediaPress]
  );

  if (isLoading) {
    return (
      <View className="px-4 py-8 items-center">
        <Text
          className="text-sm"
          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
        >
          Loading media...
        </Text>
      </View>
    );
  }

  if (media.length === 0) {
    return (
      <View className="px-4 py-12 items-center">
        <Text
          className="text-base"
          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
        >
          No media yet
        </Text>
      </View>
    );
  }

  return (
    <View className="px-4 pb-4">
      <View
        className="flex-row flex-wrap"
        style={{
          marginHorizontal: -GAP / 2,
        }}
      >
        {media.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handlePress(item, index)}
            activeOpacity={0.9}
            style={{
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              margin: GAP / 2,
              borderRadius: 8,
              overflow: 'hidden',
              backgroundColor: isAmoled ? '#000000' : isDark ? '#1f2937' : '#f3f4f6',
            }}
            accessible
            accessibilityRole="imagebutton"
            accessibilityLabel={`View image ${index + 1}`}
          >
            <Image
              source={{ uri: item.thumbnailUrl || item.url }}
              style={{
                width: '100%',
                height: '100%',
              }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

