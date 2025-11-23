import React from 'react';
import { Pressable, View, Text } from 'react-native';
import type { Byte } from '@/types/byte';
import { ByteCardHeader } from './ByteCardHeader';
import { ByteCardContent } from './ByteCardContent';
import { ByteCardMedia } from './ByteCardMedia';
import { ByteCardFooter } from './ByteCardFooter';
import { useByteCardActions } from './useByteCardActions';

export interface ByteCardProps {
  byte: Byte;
  showSeparator?: boolean;
  onPress?: () => void;
}

/**
 * ByteCard - Content-first feed card (Twitter + Reddit + Threads hybrid)
 * 
 * UI Spec:
 * - Zero-layer navigation: entire card is tappable
 * - Content-first: cooked HTML rendered as markdown
 * - Media-aware: images, link previews, future video support
 * - Teret badge: colored pill for category context
 * - Footer actions: like, comment, bookmark, share
 * - Separator: subtle divider between cards
 * - Themed: uses Fomio semantic tokens (Light + AMOLED Dark)
 * - Renders byte as-is (summary or full content)
 */
export function ByteCard({ 
  byte, 
  showSeparator = true,
  onPress,
}: ByteCardProps) {
  const { onCardPress } = useByteCardActions(byte);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      onCardPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className="px-4 pt-4 active:opacity-90"
      android_ripple={{ color: 'rgba(0,0,0,0.1)', foreground: true }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Byte by ${byte.author.name}`}
    >
      <View className="flex-1" style={{ minWidth: 0 }}>
        {/* Title first */}
        {byte.title && (
          <Text className="text-title font-bold text-fomio-foreground dark:text-fomio-foreground-dark mb-3">
            {byte.title}
          </Text>
        )}
        
        {/* Author row: avatar | name | username */}
        <ByteCardHeader byte={byte} />
        
        {/* Content, media, footer */}
        <ByteCardContent byte={byte} />
        <ByteCardMedia byte={byte} />
        <ByteCardFooter byte={byte} />
        
        {showSeparator && (
          <View className="h-[1px] bg-fomio-border-soft dark:bg-fomio-border-soft-dark opacity-20 mt-3 mb-1" />
        )}
      </View>
    </Pressable>
  );
}

