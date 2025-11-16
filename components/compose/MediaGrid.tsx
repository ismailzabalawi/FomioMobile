// UI Spec: MediaGrid
// - Display image thumbnails in scrollable horizontal grid
// - Implement remove functionality (X button)
// - Support 1-5 images with responsive layout
// - Use expo-image for optimized image rendering
// - Prepare structure for future video/GIF support

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { X } from 'phosphor-react-native';
import { cn } from '@/lib/utils/cn';

export interface MediaItem {
  uri: string;
  type?: 'image' | 'video' | 'gif';
}

interface MediaGridProps {
  media: MediaItem[];
  onRemove: (index: number) => void;
  maxItems?: number;
}

export function MediaGrid({ media, onRemove, maxItems = 5 }: MediaGridProps) {
  if (media.length === 0) {
    return null;
  }

  return (
    <View className="mx-4 mt-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {media.slice(0, maxItems).map((item, index) => (
          <View
            key={`${item.uri}-${index}`}
            className="relative w-24 h-24 rounded-fomio-card overflow-hidden bg-fomio-card dark:bg-fomio-card-dark border border-fomio-border-soft dark:border-fomio-border-soft-dark"
          >
            <Image
              source={{ uri: item.uri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={120}
              cachePolicy="memory-disk"
            />
            <TouchableOpacity
              onPress={() => onRemove(index)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 items-center justify-center"
              accessible
              accessibilityRole="button"
              accessibilityLabel="Remove image"
            >
              <X size={14} color="#FFFFFF" weight="bold" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      {media.length > maxItems && (
        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark mt-2 text-center">
          +{media.length - maxItems} more
        </Text>
      )}
    </View>
  );
}

