import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Heart, ChatCircle, BookmarkSimple, Share } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';
import { useByteCardActions } from './useByteCardActions';
import type { Byte } from '@/types/byte';

const MIN_TOUCH_TARGET = 44;

/**
 * ByteCardFooter - Interaction actions bar
 * 
 * UI Spec:
 * - Twitter-like: like, comment, bookmark, share
 * - Icons: 20px, Phosphor icons
 * - Counts: shown if > 0
 * - Spacing: gap-6 between actions, mt-3 from content/media
 * - Touch targets: min 44px (accessibility)
 */
export function ByteCardFooter({ byte }: { byte: Byte }) {
  const { themeMode, isAmoled } = useTheme();
  const colors = getThemeColors(themeMode, isAmoled);
  
  // Debug logging - disabled by default to prevent performance issues
  // Enable by setting ENABLE_FOOTER_DEBUG = true
  const ENABLE_FOOTER_DEBUG = __DEV__ && false; // Set to true to enable debug logging
  if (ENABLE_FOOTER_DEBUG) {
    console.log('🔍 [ByteCardFooter] Rendering badges:', {
      byteId: byte.id,
      hasHub: !!byte.hub,
      hubName: byte.hub?.name,
      hubColor: byte.hub?.color,
      hasTeret: !!byte.teret,
      teretName: byte.teret?.name,
      teretColor: byte.teret?.color,
      willRender: !!(byte.hub || byte.teret),
    });
  }
  
  const {
    isLiked,
    isBookmarked,
    likeCount,
    replyCount,
    loadingLike,
    loadingBookmark,
    toggleLike,
    toggleBookmark,
    onCommentPress,
    onSharePress,
  } = useByteCardActions(byte);

  return (
    <View className="flex-row items-center justify-between mt-3 mb-3" style={{ flexWrap: 'nowrap' }}>
      <View className="flex-row items-center" style={{ gap: 24 }}>
        <FooterButton
          icon={
            <Heart 
              size={20} 
              weight={isLiked ? "fill" : "regular"} 
              color={isLiked ? colors.like : colors.comment} 
            />
          }
          count={likeCount}
          onPress={toggleLike}
          label="Like"
          loading={loadingLike}
        />
        <FooterButton
          icon={<ChatCircle size={20} weight="regular" color={colors.comment} />}
          count={replyCount}
          onPress={onCommentPress}
          label="Comment"
        />
        <FooterButton
          icon={
            <BookmarkSimple 
              size={20} 
              weight={isBookmarked ? "fill" : "regular"} 
              color={isBookmarked ? colors.bookmark : colors.comment} 
            />
          }
          onPress={toggleBookmark}
          label="Bookmark"
          loading={loadingBookmark}
        />
        <FooterButton
          icon={<Share size={20} weight="regular" color={colors.comment} />}
          onPress={onSharePress}
          label="Share"
        />
      </View>
      
      {/* Category badges in right corner: Hub (left) + Teret (right) */}
      {(byte.hub || byte.teret) && (
        <View className="flex-row items-center gap-2">
          {/* Hub badge (left) */}
          {byte.hub && byte.hub.name && (
            <Text
              className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
              style={{
                backgroundColor: byte.hub.color || '#6B7280', // Default gray for hubs
              }}
            >
              {byte.hub.name}
            </Text>
          )}
          {/* Teret badge (right) */}
          {byte.teret && byte.teret.name && (
            <Text
              className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
              style={{
                backgroundColor: byte.teret.color || '#4A6CF7',
              }}
            >
              {byte.teret.name}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

interface FooterButtonProps {
  icon: React.ReactNode;
  count?: number;
  onPress: () => void | Promise<void>;
  label: string;
  loading?: boolean;
}

function FooterButton({ icon, count, onPress, label, loading }: FooterButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="flex-row items-center gap-1 min-h-11 justify-center"
      style={{ 
        minHeight: MIN_TOUCH_TARGET,
        opacity: loading ? 0.6 : 1,
      }}
      hitSlop={8}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label}${count !== undefined && count > 0 ? `, ${count}` : ''}`}
      accessibilityState={{ disabled: loading }}
    >
      {icon}
      {count !== undefined && count > 0 && (
        <Text className="text-caption font-medium text-fomio-muted dark:text-fomio-muted-dark">
          {count}
        </Text>
      )}
    </Pressable>
  );
}

