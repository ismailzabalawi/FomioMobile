import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  ListRenderItem,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  MagnifyingGlass,
  Fire,
  Hash,
  Warning,
  ArrowClockwise,
  Rocket
} from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { searchResultToByte } from '@/shared/adapters/searchResultToByte';
import { useSearch } from '../../shared/useSearch';
import { router, useLocalSearchParams } from 'expo-router';
import { goToProfile } from '@/shared/navigation/profile';
import Animated, { FadeInDown, useAnimatedScrollHandler } from 'react-native-reanimated';
import { getThemeColors } from '@/shared/theme-constants';
import { useFluidNav } from '@/shared/navigation/fluidNavContext';
import * as Haptics from 'expo-haptics';
import { SearchInput } from '@/components/search/SearchInput';
import { TopicResultCard } from '@/components/search/TopicResultCard';
import { UserResultCard } from '@/components/search/UserResultCard';
import { HubResultCard } from '@/components/search/HubResultCard';
import { PostResultCard } from '@/components/search/PostResultCard';
import { FluidSection } from '@/shared/ui/FluidSection';
import { getTokens } from '@/shared/design/tokens';
import { Input } from '@/components/ui/input';

// UI Spec: SearchScreen
// - Uses semantic theme tokens from getThemeColors
// - Debounced search (500ms) for better UX
// - Server-side type filtering via backend API
// - FlatList for optimized rendering
// - AMOLED dark mode support with true black baseline

type SearchType = 'bytes' | 'hubs' | 'users' | 'posts';
type SearchOrder = 'relevance' | 'latest' | 'views' | 'likes' | 'created' | 'updated';
type SearchPeriod = 'all' | 'yearly' | 'quarterly' | 'monthly' | 'weekly' | 'daily';
type SearchStatus = 'open' | 'closed' | 'archived' | 'visible' | 'hidden';

// Helper to map frontend SearchType to backend type
function mapSearchTypeToBackendType(frontendType: SearchType): 'topic' | 'category' | 'user' | 'all' {
  switch (frontendType) {
    case 'bytes':
      return 'topic';
    case 'hubs':
      return 'category';
    case 'users':
      return 'user';
    case 'posts':
      return 'all';
    default:
      return 'topic';
  }
}

interface SearchResultItem {
  id: string;
  type: 'byte' | 'hub' | 'user' | 'post';
  data: any;
}

// Helper to render ByteCard from topic data
function renderTopicCard(topic: any, onPressByteId: (byteId: number | string) => void) {
  const byte = searchResultToByte(topic);
  return (
    <TopicResultCard
      byte={byte}
      onPress={() => onPressByteId(byte.id)}
    />
  );
}


function SearchTypeTabs({
  activeType,
  onChange,
  availableTypes,
}: {
  activeType: SearchType;
  onChange: (type: SearchType) => void;
  availableTypes?: SearchType[];
}) {
  const { isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';
  const tokens = useMemo(() => getTokens(mode), [mode]);
  const tabLabels: Record<SearchType, string> = {
    bytes: 'Bytes',
    hubs: 'Hubs',
    users: 'Users',
    posts: 'Posts',
  };
  const types = (availableTypes?.length ? availableTypes : ['bytes', 'hubs', 'users']).map(
    (key) => ({ key, label: tabLabels[key] })
  );

  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: isDark ? '#000000' : tokens.colors.surfaceMuted,
          borderRadius: 24,
          padding: 4,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : tokens.colors.border,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0 : 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        {types.map((tab) => {
          const isActive = tab.key === activeType;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: isActive ? (isDark ? '#1a1a1a' : tokens.colors.background) : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: isActive ? 1 : 0,
                borderColor: isActive ? (isDark ? 'rgba(255,255,255,0.22)' : tokens.colors.border) : 'transparent',
                shadowColor: isActive ? '#000' : 'transparent',
                shadowOpacity: isActive && !isDark ? 0.12 : 0,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Text
                style={{
                  color: isActive ? tokens.colors.text : tokens.colors.muted,
                  fontWeight: isActive ? '600' : '500',
                  fontSize: 13,
                  letterSpacing: 0.2,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { isDark } = useTheme();
  const tokens = useMemo(() => getTokens(isDark ? 'dark' : 'light'), [isDark]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: tokens.radii.pill,
        backgroundColor: selected ? tokens.colors.accentSoft : tokens.colors.surfaceMuted,
        borderWidth: 1,
        borderColor: selected ? tokens.colors.accent : tokens.colors.border,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        style={{
          color: selected ? tokens.colors.text : tokens.colors.muted,
          fontSize: 12,
          fontWeight: selected ? '600' : '500',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { isDark } = useTheme();
  const tokens = useMemo(() => getTokens(isDark ? 'dark' : 'light'), [isDark]);

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: tokens.colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function SearchResults({ 
  results, 
  isLoading, 
  hasError, 
  onRetry, 
  searchQuery,
  activeType,
  errorMessage,
  scrollHandler,
  onRef
}: {
  results: {
    bytes: any[];
    comments: any[];
    users: any[];
    hubs: any[];
    totalResults: number;
  };
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  searchQuery: string;
  activeType: SearchType;
  errorMessage?: string;
  scrollHandler?: any;
  onRef?: (ref: Animated.FlatList<any> | null) => void;
}) {
  const { themeMode, isAmoled, isDark } = useTheme();
  const colors = getThemeColors(themeMode, isAmoled);
  const tokens = useMemo(() => getTokens(isDark ? 'dark' : 'light'), [isDark]);

  // Handle byte press navigation
  const handleBytePress = useCallback((byteId: number | string) => {
    router.push(`/feed/${byteId}` as any);
  }, []);

  // Use results directly from backend (server-side filtering)
  const normalizedResults = useMemo(() => ({
    bytes: results?.bytes || [],
    comments: results?.comments || [],
    users: results?.users || [],
    hubs: results?.hubs || [],
    totalResults: results?.totalResults || 0
  }), [results]);

  // Build flat list data
  const listData = useMemo<SearchResultItem[]>(() => {
    const items: SearchResultItem[] = [];
    
    if (activeType === 'bytes' && normalizedResults.bytes.length > 0) {
      normalizedResults.bytes.forEach((byte) => {
        items.push({ id: `byte-${byte.id}`, type: 'byte', data: byte });
      });
    }
    
    if (activeType === 'hubs' && normalizedResults.hubs.length > 0) {
      normalizedResults.hubs.forEach((hub) => {
        items.push({ id: `hub-${hub.id}`, type: 'hub', data: hub });
      });
    }
    
    if (activeType === 'users' && normalizedResults.users.length > 0) {
      normalizedResults.users.forEach((user) => {
        items.push({ id: `user-${user.id}`, type: 'user', data: user });
      });
    }

    if (activeType === 'posts' && normalizedResults.comments.length > 0) {
      normalizedResults.comments.forEach((comment) => {
        items.push({ id: `post-${comment.id}`, type: 'post', data: comment });
      });
    }
    
    return items;
  }, [normalizedResults, activeType]);
  const displayedTotal = listData.length;
  const emptyStateByType: Record<SearchType, string> = {
    bytes: 'No bytes found',
    hubs: 'No hubs found',
    users: 'No users found',
    posts: 'No posts found',
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center py-12 px-4">
        <Animated.View entering={FadeInDown.duration(300).springify()}>
          <FluidSection mode={isDark ? 'dark' : 'light'} style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 32 }}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text className="text-base mt-4" style={{ color: colors.secondary }}>
              Searching...
            </Text>
          </FluidSection>
        </Animated.View>
      </View>
    );
  }

  if (hasError) {
    return (
      <View className="flex-1 justify-center items-center px-4 py-12">
        <Animated.View entering={FadeInDown.duration(300).springify()}>
          <FluidSection mode={isDark ? 'dark' : 'light'} style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 32 }}>
            <Warning size={48} color={colors.destructive} />
            <Text 
              className="text-base font-semibold mt-4 text-center"
              style={{ color: colors.destructive }}
            >
              {errorMessage || 'Search failed'}
            </Text>
            {errorMessage && errorMessage.length > 60 && (
              <Text 
                className="text-xs mt-2 text-center"
                style={{ color: colors.secondary }}
              >
                {errorMessage}
              </Text>
            )}
            <TouchableOpacity 
              onPress={onRetry} 
              className="flex-row items-center gap-2 px-4 py-2 mt-4"
              style={[
                {
                  backgroundColor: tokens.colors.surfaceMuted,
                  borderRadius: tokens.radii.md,
                },
              ]}
            >
              <ArrowClockwise size={16} color={colors.destructive} />
              <Text className="text-sm font-semibold" style={{ color: colors.destructive }}>
                Retry
              </Text>
            </TouchableOpacity>
          </FluidSection>
        </Animated.View>
      </View>
    );
  }

  if (displayedTotal === 0) {
    return (
      <View className="flex-1 justify-center items-center px-4 py-12">
        <Animated.View entering={FadeInDown.duration(300).springify()}>
          <FluidSection mode={isDark ? 'dark' : 'light'} style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 32 }}>
            <MagnifyingGlass size={48} color={colors.secondary} />
            <Text className="text-base mt-4 text-center" style={{ color: colors.secondary }}>
              {searchQuery.length > 0 && searchQuery.length < 3 
                ? 'Type at least 3 characters to search'
                : emptyStateByType[activeType]
              }
            </Text>
          </FluidSection>
        </Animated.View>
      </View>
    );
  }

  const renderItem: ListRenderItem<SearchResultItem> = ({ item, index }) => {
    // Stagger delay based on index (max 8 items staggered)
    const staggerDelay = Math.min(index, 8) * tokens.motion.stagger;

    if (item.type === 'byte') {
      return (
        <Animated.View 
          className="mb-3"
          entering={FadeInDown.delay(staggerDelay).duration(350).springify()}
        >
          {renderTopicCard(item.data, handleBytePress)}
        </Animated.View>
      );
    }

    if (item.type === 'hub') {
      return (
        <Animated.View entering={FadeInDown.delay(staggerDelay).duration(350).springify()}>
          <HubResultCard
            hub={item.data}
            onPress={() => router.push(`/feed?category=${item.data.slug}`)}
          />
        </Animated.View>
      );
    }

    if (item.type === 'user') {
      const user = item.data;
      const username = user?.username || '';
      
      return (
        <Animated.View entering={FadeInDown.delay(staggerDelay).duration(350).springify()}>
          <UserResultCard
            user={item.data}
            onPress={() => {
              if (username) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                goToProfile(username);
              } else {
                console.warn('User result missing username:', item.data);
              }
            }}
          />
        </Animated.View>
      );
    }

    if (item.type === 'post') {
      const byteId = item.data.byteId || item.data.topicId || item.data.topic_id;
      return (
        <Animated.View entering={FadeInDown.delay(staggerDelay).duration(350).springify()}>
          <PostResultCard
            comment={item.data}
            onPress={() => {
              if (byteId) {
                router.push(`/feed/${byteId}` as any);
              }
            }}
          />
        </Animated.View>
      );
    }

    return null;
  };

  return (
    <Animated.FlatList
      ref={onRef}
      data={listData}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      style={{ flex: 1 }}
      contentContainerStyle={{ 
        paddingHorizontal: 16, 
        paddingBottom: 32,
        flexGrow: listData.length === 0 ? 1 : 0
      }}
      showsVerticalScrollIndicator={false}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      scrollEnabled={true}
      ListHeaderComponent={
        displayedTotal > 0 ? (
          <Animated.View 
            entering={FadeInDown.duration(300).springify()}
            className="mb-4"
          >
            <FluidSection mode={isDark ? 'dark' : 'light'} style={{ paddingVertical: 12 }}>
              <Text 
                className="text-lg font-bold"
                style={{ color: colors.foreground }}
              >
                {displayedTotal} result{displayedTotal !== 1 ? 's' : ''}
              </Text>
            </FluidSection>
          </Animated.View>
        ) : null
      }
    />
  );
}

// Placeholder cards for empty state with FluidSection styling
function EmptyStateCards() {
  const { themeMode, isAmoled, isDark } = useTheme();
  const colors = getThemeColors(themeMode, isAmoled);
  const tokens = useMemo(() => getTokens(isDark ? 'dark' : 'light'), [isDark]);

  const cards = [
    {
      icon: Rocket,
      title: "Search is just waking up 🚀",
      text: "Start typing to search for posts, tags, and people. As Fomio grows, you'll find more content here.",
    },
    {
      icon: Fire,
      title: "Help us start the fire",
      text: "Create posts, explore tags, and engage with the community. This page will come alive with your contributions.",
    },
    {
      icon: Hash,
      title: "Explore what's here",
      text: "Use the search bar above to find posts, tags, or people. Try searching for keywords related to your interests.",
    },
  ];

  return (
    <Animated.ScrollView 
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Animated.View
            key={index}
            entering={FadeInDown.delay(index * tokens.motion.stagger).duration(400).springify()}
            className="mb-4"
          >
            <FluidSection mode={isDark ? 'dark' : 'light'} style={{ alignItems: 'center' }}>
              <IconComponent size={32} color={colors.accent} weight="duotone" />
              <Text 
                className="text-lg font-bold mt-4 mb-2 text-center"
                style={{ color: colors.foreground }}
              >
                {card.title}
              </Text>
              <Text 
                className="text-sm text-center leading-5"
                style={{ color: colors.secondary }}
              >
                {card.text}
              </Text>
            </FluidSection>
          </Animated.View>
        );
      })}
    </Animated.ScrollView>
  );
}

export default function SearchScreen(): React.ReactElement {
  const { themeMode, isAmoled } = useTheme();
  const { q: initialQuery } = useLocalSearchParams<{ q?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<SearchType>('bytes');
  const [showFilters, setShowFilters] = useState(false);
  const [order, setOrder] = useState<SearchOrder>('relevance');
  const [period, setPeriod] = useState<SearchPeriod>('all');
  const [category, setCategory] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<SearchStatus | null>(null);
  const [initialQueryApplied, setInitialQueryApplied] = useState(false);
  const { scrollY, setUpHandler } = useFluidNav();
  const flatListRef = useRef<Animated.FlatList<any>>(null);
  
  const { 
    search, 
    searchWithDebounce,
    clearSearch,
    results, 
    isLoading: isSearchLoading, 
    hasError: hasSearchError, 
    error: searchError,
    retry: retrySearch,
  } = useSearch();
  
  const availableTypes = useMemo<SearchType[]>(() => {
    const base: SearchType[] = ['bytes', 'hubs', 'users'];
    if (results?.comments && results.comments.length > 0) {
      base.push('posts');
    }
    return base;
  }, [results]);

  useEffect(() => {
    if (!availableTypes.includes(activeType)) {
      setActiveType('bytes');
    }
  }, [activeType, availableTypes]);

  // Handle deep link with pre-filled query (fomio://search?q=...)
  useEffect(() => {
    if (initialQuery && !initialQueryApplied) {
      setInitialQueryApplied(true);
      setSearchQuery(initialQuery);
      // Trigger search immediately if query is long enough
      if (initialQuery.trim().length >= 3) {
        const backendType = mapSearchTypeToBackendType(activeType);
        search(initialQuery.trim(), { type: backendType });
      }
    }
  }, [initialQuery, initialQueryApplied, activeType, search]);

  const colors = useMemo(() => getThemeColors(themeMode, isAmoled), [themeMode, isAmoled]);

  const parsedTags = useMemo(
    () => tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    [tags]
  );

  const buildFilters = useCallback(() => {
    return {
      type: mapSearchTypeToBackendType(activeType),
      order,
      period,
      category: category.trim() || undefined,
      author: author.trim() || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      status: status || undefined,
    };
  }, [activeType, order, period, category, author, parsedTags, status]);

  // Configure header
  useScreenHeader({
    title: searchQuery.trim() ? "Search Results" : "Search",
    canGoBack: searchQuery.trim() ? true : false,
    withSafeTop: false,
    tone: "bg",
    compact: true,
    titleFontSize: 20,
  }, [searchQuery, themeMode]);

  // Debounced search handling with type filter
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    const trimmed = query.trim();
    
    if (trimmed.length >= 3) {
      // Use debounced search with type filter
      searchWithDebounce(trimmed, buildFilters(), 500);
    } else if (trimmed.length > 0) {
      // Clear previous results for short queries
      clearSearch();
    } else if (trimmed.length === 0) {
      // Clear results when query is empty
      clearSearch();
    }
  }, [searchWithDebounce, buildFilters, clearSearch]);

  // Handle search type change - trigger new search with type filter
  const handleTypeChange = useCallback((type: SearchType) => {
    setActiveType(type);
    if (searchQuery.trim().length >= 3) {
      search(searchQuery.trim(), buildFilters());
    }
  }, [searchQuery, search, buildFilters]);

  useEffect(() => {
    if (searchQuery.trim().length >= 3) {
      search(searchQuery.trim(), buildFilters());
    }
  }, [buildFilters, searchQuery, search]);

  // Fluid nav: Scroll-to-top handler
  const handleScrollToTop = useCallback(() => {
    console.log('[Search] Scroll-to-top handler called');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Share scroll position with fluid nav and keep scroll-to-top handler accessible
  useEffect(() => {
    console.log('[Search] Registering scroll-to-top handler');
    setUpHandler(handleScrollToTop);
    return () => {
      console.log('[Search] Clearing scroll-to-top handler');
      setUpHandler(null);
    };
  }, [handleScrollToTop, setUpHandler]);

  // Animated scroll handler for fluid nav
  const animatedScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Reset shared scroll on mount so tab bar starts composed on this screen
  useEffect(() => {
    scrollY.value = 0;
  }, [scrollY]);

  // Handle search submission
  const handleSearchSubmit = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length >= 3) {
      const backendType = mapSearchTypeToBackendType(activeType);
      search(trimmed, { type: backendType });
    }
  }, [searchQuery, activeType, search]);

  // Show search results if there's a query
  if (searchQuery.trim().length >= 3) {
    return (
      <SafeAreaView 
        className="flex-1"
        style={{ backgroundColor: colors.background }}
      >
      <SearchInput
        value={searchQuery}
        onChangeText={handleSearch}
        onSubmitEditing={handleSearchSubmit}
      />

      <SearchTypeTabs
        activeType={activeType}
        onChange={handleTypeChange}
        availableTypes={availableTypes}
      />

      <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
        <TouchableOpacity
          onPress={() => setShowFilters((prev) => !prev)}
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
          }}
          accessibilityRole="button"
          accessibilityLabel={showFilters ? 'Hide filters' : 'Show filters'}
        >
          <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '600' }}>
            {showFilters ? 'Hide filters' : 'Filters'}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          <FilterSection title="Order">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(['relevance', 'latest', 'views', 'likes', 'created', 'updated'] as SearchOrder[]).map((option) => (
                <FilterChip
                  key={option}
                  label={option}
                  selected={order === option}
                  onPress={() => setOrder(option)}
                />
              ))}
            </ScrollView>
          </FilterSection>

          <FilterSection title="Period">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(['all', 'yearly', 'quarterly', 'monthly', 'weekly', 'daily'] as SearchPeriod[]).map((option) => (
                <FilterChip
                  key={option}
                  label={option}
                  selected={period === option}
                  onPress={() => setPeriod(option)}
                />
              ))}
            </ScrollView>
          </FilterSection>

          <FilterSection title="Status">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(['open', 'closed', 'archived', 'visible', 'hidden'] as SearchStatus[]).map((option) => (
                <FilterChip
                  key={option}
                  label={option}
                  selected={status === option}
                  onPress={() => setStatus(status === option ? null : option)}
                />
              ))}
            </ScrollView>
          </FilterSection>

          <FilterSection title="Category">
            <Input
              value={category}
              onChangeText={setCategory}
              placeholder="Category slug"
              accessibilityLabel="Category filter"
            />
          </FilterSection>

          <FilterSection title="Author">
            <Input
              value={author}
              onChangeText={setAuthor}
              placeholder="Username"
              accessibilityLabel="Author filter"
            />
          </FilterSection>

          <FilterSection title="Tags">
            <Input
              value={tags}
              onChangeText={setTags}
              placeholder="tag1, tag2"
              accessibilityLabel="Tags filter"
            />
          </FilterSection>
        </View>
      )}

        <SearchResults 
          results={results ? {
            bytes: results.bytes || [],
            comments: results.comments || [],
            users: results.users || [],
            hubs: results.hubs || [],
            totalResults: results.totalResults || 0
          } : { bytes: [], comments: [], users: [], hubs: [], totalResults: 0 }}
          isLoading={isSearchLoading}
          hasError={hasSearchError}
          onRetry={retrySearch}
          searchQuery={searchQuery}
          activeType={activeType}
          errorMessage={searchError || undefined}
          scrollHandler={animatedScrollHandler}
          onRef={(ref) => { flatListRef.current = ref; }}
        />
      </SafeAreaView>
    );
  }

  // Empty state with placeholder cards
  return (
    <SafeAreaView 
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <SearchInput
        value={searchQuery}
        onChangeText={handleSearch}
        onSubmitEditing={handleSearchSubmit}
      />

      <SearchTypeTabs
        activeType={activeType}
        onChange={handleTypeChange}
      />

      <EmptyStateCards />
    </SafeAreaView>
  );
}
