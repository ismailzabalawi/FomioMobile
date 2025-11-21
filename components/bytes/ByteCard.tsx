import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Byte } from '@/types/byte';
import { ByteCardHeader } from './ByteCardHeader';
import { ByteCardContent } from './ByteCardContent';
import { ByteCardMedia } from './ByteCardMedia';
import { ByteCardFooter } from './ByteCardFooter';

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
 */
export function ByteCard({ 
  byte, 
  showSeparator = true,
  onPress,
}: ByteCardProps) {
  const router = useRouter();

  const handlePress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    if (onPress) {
      onPress();
    } else {
      router.push(`/feed/${byte.id}`);
    }
  }, [byte.id, onPress, router]);

  return (
    <Pressable
      onPress={handlePress}
      className="px-4 pt-4 active:opacity-90"
      android_ripple={{ color: 'rgba(0,0,0,0.1)', foreground: true }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Byte by ${byte.author.name}`}
    >
      <View className="flex-row gap-3">
        {/* Avatar is inside header component */}
        <View className="flex-1" style={{ minWidth: 0 }}>
          <ByteCardHeader byte={byte} />
          <ByteCardContent byte={byte} />
          <ByteCardMedia byte={byte} />
          <ByteCardFooter byte={byte} />
          
          {showSeparator && (
            <View className="h-[1px] bg-fomio-border-soft dark:bg-fomio-border-soft-dark opacity-20 mt-3 mb-1" />
          )}
        </View>
      </View>
    </Pressable>
  );
}

