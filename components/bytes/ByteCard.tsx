import React, { useRef, useCallback } from 'react';
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
  // Guard against invalid bytes
  if (!byte || !byte.id || !byte.title) {
    if (__DEV__) {
      console.warn('⚠️ [ByteCard] Invalid byte prop:', { 
        hasByte: !!byte, 
        hasId: !!byte?.id, 
        hasTitle: !!byte?.title 
      });
    }
    return null;
  }

  const { onCardPress } = useByteCardActions(byte);
  
  // Track if header area was pressed to prevent parent Pressable from handling
  const headerPressedRef = useRef(false);

  const handlePress = () => {
    // If header was pressed, skip card navigation
    if (headerPressedRef.current) {
      headerPressedRef.current = false;
      return;
    }
    
    if (onPress) {
      onPress();
    } else {
      onCardPress();
    }
  };

  const handlePressIn = () => {
    // Reset flag on press start to allow new presses
    headerPressedRef.current = false;
  };

  const handleHeaderPress = useCallback(() => {
    headerPressedRef.current = true;
    // Reset after navigation completes
    setTimeout(() => {
      headerPressedRef.current = false;
    }, 200);
  }, []);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      className="px-4 pt-4 active:opacity-90"
      android_ripple={{ color: 'rgba(0,0,0,0.1)', foreground: true }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Byte by ${byte.author.name}`}
      style={{ width: '100%' }}
    >
      <View style={{ width: '100%', minWidth: 0 }}>
        {/* Remove flex-1 - FlatList items should use natural height */}
        {/* Title first */}
        {byte.title && (
          <Text className="text-title font-bold text-fomio-foreground dark:text-fomio-foreground-dark mb-3">
            {byte.title}
          </Text>
        )}
        
        {/* Author row: avatar | name | username */}
        <ByteCardHeader byte={byte} onHeaderPress={handleHeaderPress} />
        
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

