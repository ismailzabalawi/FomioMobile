import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ByteBlogPage } from '../../components/feed/ByteBlogPage';
import { HeaderBar } from '../../components/nav/HeaderBar';
import { useTheme } from '../../components/shared/theme-provider';

// UI Spec: Dynamic Byte Detail Route — Renders ByteBlogPage with data from route params
// Provides seamless navigation from feed to detailed byte view with proper theming
export default function ByteDetailScreen(): JSX.Element {
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

  return (
    <SafeAreaView style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
      <HeaderBar 
        title="Byte Details"
        showBackButton={true}
        showProfileButton={true}
      />
      <ByteBlogPage
        topicId={parseInt(byteId || '0')}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onBookmark={handleBookmark}
        initialCommentsVisible={showComments === 'true'}
      />
    </SafeAreaView>
  );
} 