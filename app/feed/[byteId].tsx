import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ByteBlogPage } from '../../components/feed/ByteBlogPage';
import { useTheme } from '@/components/theme';

// UI Spec: Dynamic Byte Detail Route — Renders ByteBlogPage with data from route params
// Provides seamless navigation from feed to detailed byte view with proper theming
// Header is now handled by ByteBlogPage component
// Note: Do NOT wrap in SafeAreaView - ByteBlogPage handles its own safe areas
export default function ByteDetailScreen(): React.ReactElement {
  const { byteId, showComments } = useLocalSearchParams<{ byteId: string; showComments?: string }>();
  const { isDark, isAmoled } = useTheme();
  
  console.log('ByteDetailScreen rendered with byteId:', byteId);
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
  };

  const handleLike = (): void => {
    console.log('Like pressed for byte:', byteId);
  };

  const handleComment = (): void => {
    console.log('Comment pressed for byte:', byteId);
  };

  const handleShare = (): void => {
    console.log('Share pressed for byte:', byteId);
  };

  const handleBookmark = (): void => {
    console.log('Bookmark pressed for byte:', byteId);
  };

  // Use plain View instead of SafeAreaView - ByteBlogPage handles safe areas internally
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ByteBlogPage
        topicId={parseInt(byteId || '0')}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onBookmark={handleBookmark}
        initialCommentsVisible={showComments === 'true'}
      />
    </View>
  );
} 