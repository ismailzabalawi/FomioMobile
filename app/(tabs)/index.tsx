import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Image, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/components/theme';
import { ByteCard } from '@/components/bytes/ByteCard';
import { topicSummaryToByte } from '@/shared/adapters/topicSummaryToByte';
import { useFeedHeader } from '@/shared/hooks/useFeedHeader';
import { useFeed, FeedItem } from '../../shared/useFeed';
import { useAuth } from '@/shared/auth-context';
import { getSession } from '../../lib/discourse';
import { FeedFilterChips } from '@/components/feed/FeedFilterChips';
import { useHubs } from '@/shared/useHubs';
import { ByteCardSkeleton } from '@/components/bytes/ByteCardSkeleton';
import { ArrowClockwise, Newspaper, Bell } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useFluidNav } from '@/shared/navigation/fluidNavContext';

export default function HomeScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { hubs } = useHubs();
  const { scrollY, setUpHandler } = useFluidNav();
  
  const [selectedSort, setSelectedSort] = useState<'latest' | 'hot' | 'unread'>('latest');
  const [selectedHubId, setSelectedHubId] = useState<number | undefined>(undefined);
  const filtersVisible = false;
  const flatListRef = useRef<Animated.FlatList<FeedItem>>(null);

  const colors = useMemo(() => ({
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    error: isDark ? '#ef4444' : '#dc2626',
    primary: isDark ? '#26A69A' : '#009688',
  }), [isAmoled, isDark]);

  // Memoize filters to prevent unnecessary re-renders
  const feedFilters = useMemo(() => ({
    hubId: selectedHubId,
    sortBy: selectedSort,
  }), [selectedHubId, selectedSort]);
  
  const { 
    items, 
    isLoading: isFeedLoading, 
    isRefreshing, 
    hasError, 
    errorMessage, 
    hasMore, 
    refresh, 
    loadMore, 
    retry 
  } = useFeed(feedFilters);
  
  const [currentUser, setCurrentUser] = useState<any>(null);

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
  
  // Load user session if authenticated
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      getSession()
        .then((session) => {
          setCurrentUser(session.user || user);
        })
        .catch((err: any) => {
          // Only log if it's not an expected "not authenticated" error
          if (err?.message && !err.message.includes('Not authenticated') && !err.message.includes('Please sign in')) {
            console.warn('Failed to load session:', err.message);
          }
          // If not authenticated, that's expected - don't log as error
        });
    }
  }, [isAuthenticated, isAuthLoading, user]);
  
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

  const renderFooter = () => {
    if (!hasMore) {
      return (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.secondary }]}>
            No more posts to load
          </Text>
        </View>
      );
    }
    
    if (isFeedLoading) {
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
  };

  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    retry();
  }, [retry]);

  const handleScrollToTop = useCallback(() => {
    console.log('[Feed] ===== Scroll-to-top handler CALLED =====');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);
  
  // Share scroll position with fluid nav and keep scroll-to-top handler accessible
  useEffect(() => {
    console.log('[Feed] ===== Registering scroll-to-top handler =====');
    setUpHandler(handleScrollToTop);
    return () => {
      console.log('[Feed] ===== Clearing scroll-to-top handler =====');
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

  const renderError = () => {
    if (!hasError) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {errorMessage || 'Failed to load posts'}
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
  };

  const renderErrorBanner = () => {
    if (!hasError || items.length === 0) return null;
    
    return (
      <View style={[styles.errorBanner, { backgroundColor: colors.error + '10', borderBottomColor: colors.error + '20' }]}>
        <Text style={[styles.errorBannerText, { color: colors.error }]}>
          {errorMessage || 'Failed to refresh'}
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
  };

  const renderEmptyState = () => {
    if (hasError || items.length > 0 || isFeedLoading) return null;
    
    let message = 'No posts yet';
    let icon = Newspaper;
    
    if (selectedHubId) {
      message = 'No posts in this category yet';
    } else if (selectedSort === 'unread') {
      message = 'No unread posts';
      icon = Bell;
    }
    
    return (
      <View style={styles.emptyContainer}>
        {React.createElement(icon, { size: 48, color: colors.secondary, weight: 'regular' })}
        <Text style={[styles.emptyText, { color: colors.text }]}>
          {message}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.secondary }]}>
          {selectedHubId ? 'Try a different category' : 'Try a different filter'}
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          onPress={refresh}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Refresh feed"
        >
          <Text style={[styles.emptyButtonText, { color: '#ffffff' }]}>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isFeedLoading && items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {filtersVisible && (
          <FeedFilterChips
            activeSort={selectedSort}
            onSortChange={setSelectedSort}
            activeHubId={selectedHubId}
            onHubChange={setSelectedHubId}
            hubs={hubs}
            isAuthenticated={isAuthenticated}
          />
        )}
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
      {filtersVisible && (
        <FeedFilterChips
          activeSort={selectedSort}
          onSortChange={setSelectedSort}
          activeHubId={selectedHubId}
          onHubChange={setSelectedHubId}
          hubs={hubs}
          isAuthenticated={isAuthenticated}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
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
  connectButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
