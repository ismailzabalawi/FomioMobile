import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Image, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/components/theme';
import { ByteCard } from '@/components/bytes/ByteCard';
import { useFeedHeader } from '@/shared/hooks/useFeedHeader';
import { useFeed, FeedItem } from '../../shared/useFeed';
import { useAuth } from '@/shared/auth-context';
import { ByteCardSkeleton } from '@/components/bytes/ByteCardSkeleton';
import { ArrowClockwise, Newspaper } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useFluidNav } from '@/shared/navigation/fluidNavContext';

export default function HomeScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { scrollY, setUpHandler } = useFluidNav();
  
  const flatListRef = useRef<Animated.FlatList<FeedItem>>(null);

  const colors = useMemo(() => ({
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    error: isDark ? '#ef4444' : '#dc2626',
    primary: isDark ? '#26A69A' : '#009688',
  }), [isAmoled, isDark]);
  
  const { 
    items, 
    isLoading: isFeedLoading, 
    isRefreshing, 
    isFetchingNextPage,
    hasError, 
    errorMessage, 
    hasMore, 
    refresh, 
    loadMore, 
    retry 
  } = useFeed(); // No filters - always fetch latest

  const headerTitle = useMemo(
    () => (
      <Image
        source={require('../../assets/images/favicon.png')}
        style={{ width: 32, height: 32, borderRadius: 8 }}
        resizeMode="contain"
        accessibilityLabel="Fomio"
      />
    ),
    []
  );

  // Configure header with centered logo
  useFeedHeader({
    title: headerTitle,
    centerTitle: true,
  });
  
  const handleBytePress = useCallback((byteId: number): void => {
    router.push(`/feed/${byteId}` as any);
  }, []);

  const renderFeedItem = useCallback(({ item }: { item: FeedItem }): React.ReactElement => {
    return (
      <ByteCard
        byte={item}
        onPressByteId={handleBytePress}
      />
    );
  }, [handleBytePress]);

  const keyExtractor = useCallback((item: FeedItem) => item.id.toString(), []);

  const getErrorMessage = useCallback((error: string | null) => {
    if (!error) return 'Failed to load posts';
    const errorLower = error.toLowerCase();
    if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('connection')) {
      return 'Connection issue. Check your internet and try again.';
    }
    return error;
  }, []);

  const renderFooter = useCallback(() => {
    if (!hasMore) {
      return (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.secondary }]}>
            No more posts to load
          </Text>
        </View>
      );
    }
    
    if (isFetchingNextPage) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.text} />
          <Text style={[styles.footerText, { color: colors.secondary }]}>
            Loading more posts...
          </Text>
        </View>
      );
    }
    
    return null;
  }, [hasMore, isFetchingNextPage, colors.text, colors.secondary]);

  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    retry();
  }, [retry]);

  const handleScrollToTop = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);
  
  // Share scroll position with fluid nav and keep scroll-to-top handler accessible
  useEffect(() => {
    setUpHandler(handleScrollToTop);
    return () => {
      setUpHandler(null);
    };
  }, [handleScrollToTop, setUpHandler]);

  const animatedScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Reset shared scroll on mount to keep nav state consistent across tabs
  useEffect(() => {
    scrollY.value = 0;
  }, [scrollY]);

  const renderError = useCallback(() => {
    if (!hasError) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {getErrorMessage(errorMessage)}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRetry}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Retry loading posts"
        >
          <ArrowClockwise size={16} color={colors.text} weight="regular" />
          <Text style={[styles.retryText, { color: colors.text }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [hasError, errorMessage, colors, handleRetry, getErrorMessage]);

  const renderErrorBanner = useCallback(() => {
    if (!hasError || items.length === 0) return null;
    
    return (
      <View style={[styles.errorBanner, { backgroundColor: colors.error + '10', borderBottomColor: colors.error + '20' }]}>
        <Text style={[styles.errorBannerText, { color: colors.error }]}>
          {getErrorMessage(errorMessage)}
        </Text>
        <TouchableOpacity 
          onPress={handleRetry}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <ArrowClockwise size={16} color={colors.error} weight="regular" />
        </TouchableOpacity>
      </View>
    );
  }, [hasError, items.length, errorMessage, colors, handleRetry, getErrorMessage]);

  const renderEmptyState = useCallback(() => {
    if (hasError || items.length > 0 || isFeedLoading) return null;
    
    const emptyMessage = isAuthenticated 
      ? 'Pull down to refresh or check back later'
      : 'Sign in to see personalized content';
    
    return (
      <View style={styles.emptyContainer}>
        {React.createElement(Newspaper, { size: 48, color: colors.secondary, weight: 'regular' })}
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No posts yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.secondary }]}>
          {emptyMessage}
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          onPress={refresh}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Refresh feed"
        >
          <Text style={[styles.emptyButtonText, { color: colors.background }]}>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [hasError, items.length, isFeedLoading, colors, refresh, isAuthenticated]);

  if (isFeedLoading && items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={Array(5).fill(null)}
          renderItem={() => <ByteCardSkeleton />}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.feedContainer}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {renderErrorBanner()}
      <Animated.FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.text}
            colors={[colors.text]}
          />
        }
        onScroll={animatedScrollHandler}
        scrollEventThrottle={100}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={hasError ? renderError : renderEmptyState}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  errorContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryText: {
    fontSize: 14,
    marginLeft: 6,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  errorBannerText: {
    fontSize: 14,
    flex: 1,
  },
  feedContainer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 
