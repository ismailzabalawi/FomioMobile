// UI Spec: ProfileTabView
// - Collapsible tab view with Twitter/X-style tabs
// - Profile header collapses on scroll
// - Tabs: All, Topics, Replies, Read, Drafts, Likes, Bookmarked, Solved, Votes
// - Visibility logic: Show/hide tabs based on isOwnProfile and isAuthenticated
// - Pull-to-refresh support
// - Lazy loading tabs

import React, { useMemo, useCallback, lazy, Suspense } from 'react';
import { View, Platform, useWindowDimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'react-native-collapsible-tab-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnimatedScrollHandler } from 'react-native-reanimated';
import { 
  List, 
  Article, 
  ChatCircle, 
  Eye, 
  NotePencil, 
  Heart, 
  BookmarkSimple, 
  CheckCircle, 
  ThumbsUp 
} from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { DiscourseUser } from '@/shared/discourseApi';
import { useHeader } from '@/components/ui/header';
import { ProfileHeader, ProfileBio, ProfileStats, ProfileActions } from './';
import { ProfileTabBar, TabItem } from './ProfileTabBar';
import { getTokens } from '@/shared/design/tokens';
import { PostSkeletonEnhanced } from '@/components/shared/loading.enhanced';
// Lazy load tab components to reduce initial bundle size and improve first load performance
const ProfileActivityAllTab = lazy(() => import('./tabs/ProfileActivityAllTab').then(m => ({ default: m.ProfileActivityAllTab })));
const ProfileActivityTopicsTab = lazy(() => import('./tabs/ProfileActivityTopicsTab').then(m => ({ default: m.ProfileActivityTopicsTab })));
const ProfileActivityRepliesTab = lazy(() => import('./tabs/ProfileActivityRepliesTab').then(m => ({ default: m.ProfileActivityRepliesTab })));
const ProfileActivityReadTab = lazy(() => import('./tabs/ProfileActivityReadTab').then(m => ({ default: m.ProfileActivityReadTab })));
const ProfileActivityDraftsTab = lazy(() => import('./tabs/ProfileActivityDraftsTab').then(m => ({ default: m.ProfileActivityDraftsTab })));
const ProfileActivityLikesTab = lazy(() => import('./tabs/ProfileActivityLikesTab').then(m => ({ default: m.ProfileActivityLikesTab })));
const ProfileActivityBookmarkedTab = lazy(() => import('./tabs/ProfileActivityBookmarkedTab').then(m => ({ default: m.ProfileActivityBookmarkedTab })));
const ProfileActivitySolvedTab = lazy(() => import('./tabs/ProfileActivitySolvedTab').then(m => ({ default: m.ProfileActivitySolvedTab })));
const ProfileActivityVotesTab = lazy(() => import('./tabs/ProfileActivityVotesTab').then(m => ({ default: m.ProfileActivityVotesTab })));

// Loading fallback for lazy-loaded tabs
const TabLoadingFallback = () => (
  <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
    <PostSkeletonEnhanced />
  </View>
);

export interface ProfileTabViewProps {
  user: DiscourseUser | null;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  onReport?: () => void;
  onBlock?: () => void;
  votingEnabled?: boolean;
  containerRef?: React.RefObject<any>;
  scrollY?: any;
}

const ALL_TABS: TabItem[] = [
  { key: 'all', title: 'All', icon: List },
  { key: 'topics', title: 'Topics', icon: Article },
  { key: 'replies', title: 'Replies', icon: ChatCircle },
  { key: 'read', title: 'Read', icon: Eye },
  { key: 'drafts', title: 'Drafts', icon: NotePencil },
  { key: 'likes', title: 'Likes', icon: Heart },
  { key: 'bookmarked', title: 'Bookmarked', icon: BookmarkSimple },
  { key: 'solved', title: 'Solved', icon: CheckCircle },
  { key: 'votes', title: 'Votes', icon: ThumbsUp },
];

function getVisibleTabs(
  isOwnProfile: boolean,
  isAuthenticated: boolean,
  votingEnabled: boolean = false
): TabItem[] {
  return ALL_TABS.filter((tab) => {
    switch (tab.key) {
      case 'all':
      case 'topics':
      case 'replies':
      case 'solved':
        return true; // Public tabs
      case 'read':
      case 'drafts':
      case 'likes':
      case 'bookmarked':
        return isOwnProfile && isAuthenticated; // Own profile only
      case 'votes':
        return isOwnProfile && isAuthenticated && votingEnabled; // Own profile + voting enabled
      default:
        return false;
    }
  });
}

export function ProfileTabView({
  user,
  isOwnProfile,
  isAuthenticated,
  onReport,
  onBlock,
  votingEnabled = false,
  containerRef,
  scrollY,
}: ProfileTabViewProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { header } = useHeader();
  const { width: screenWidth } = useWindowDimensions();
  const mode = isDark ? 'dark' : 'light';
  const tokens = useMemo(() => getTokens(mode), [mode]);
  const [headerHeight, setHeaderHeight] = React.useState<number>(0);
  const pageBackground = mode === 'dark' ? '#000000' : '#f8fafc';
  
  // Calculate app header height to prevent tab bar from going under it
  const BASE_BAR_HEIGHT = Platform.OS === 'ios' ? 40 : 44;
  const HEADER_PADDING = Platform.OS === 'ios' ? 4 : 2;
  const baseHeaderHeight = BASE_BAR_HEIGHT + HEADER_PADDING;
  const measuredHeaderHeight = header.headerHeight ?? baseHeaderHeight;
  
  // When extendToStatusBar is true, header includes status bar area
  // We need to account for the full header height including status bar
  const containerHeaderHeight = header.extendToStatusBar
    ? measuredHeaderHeight
    : measuredHeaderHeight + insets.top;
  
  const tabBarTopPadding = Math.max(containerHeaderHeight - 16, 0);
  const backgroundGradient = useMemo(
    (): [string, string] =>
      mode === 'dark'
        ? ['#000000', '#05070b']
        : ['#f8fafc', tokens.colors.surfaceMuted],
    [mode, tokens.colors.surfaceMuted]
  );
  // Scroll handler for tracking scroll position for fluid nav
  // This tracks the container's scroll position (header collapse)
  // Throttled to reduce worklet overhead
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      if (scrollY) {
        // Update scroll position - collapsible tab view handles its own scroll
        scrollY.value = event.contentOffset.y;
      }
    },
  }, [scrollY]);

  const visibleTabs = useMemo(
    () => getVisibleTabs(isOwnProfile, isAuthenticated, votingEnabled),
    [isOwnProfile, isAuthenticated, votingEnabled]
  );

  // Scroll tracking for fluid nav
  // react-native-collapsible-tab-view uses a container scroll view that collapses the header
  // The scrollHandler is passed to scrollViewProps.onScroll to track the container's scroll position
  // This is the scroll that matters for the tab bar animations (header collapse = scrollY increases)

  const handleHeaderLayout = useCallback(
    (event: any) => {
      const nextHeight = event?.nativeEvent?.layout?.height ?? 0;
      if (!nextHeight) return;
      if (Math.abs(nextHeight - headerHeight) > 2) {
        setHeaderHeight(nextHeight);
      }
    },
    [headerHeight]
  );

  const renderHeader = useCallback(() => {
    if (!user) return null;

    return (
      <View 
        style={{ 
          width: '100%', 
          marginTop: -8, 
          backgroundColor: pageBackground 
        }}
        onLayout={handleHeaderLayout}
      >
        <ProfileHeader
          user={user}
          isPublic={!isOwnProfile}
        />
        <ProfileBio bio={user.bio_raw} isOwnProfile={isOwnProfile} />
        <ProfileStats user={user} />
        <ProfileActions
          mode={isOwnProfile ? 'myProfile' : 'publicProfile'}
          username={user.username}
          onReport={onReport}
          onBlock={onBlock}
        />
      </View>
    );
  }, [user, isOwnProfile, mode, onReport, onBlock, handleHeaderLayout, pageBackground]);

  const renderTabBar = useCallback(
    (props: any) => {
      return (
        <View
          style={{
            paddingTop: tabBarTopPadding,
            width: '100%',
            paddingHorizontal: 12,
            backgroundColor: mode === 'dark' ? '#000000' : tokens.colors.surfaceMuted,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: tokens.colors.border,
          }}
        >
          <ProfileTabBar
            tabs={visibleTabs}
            indexSharedValue={props.index}
            onTabPress={props.onTabPress}
            tabNames={props.tabNames}
          />
        </View>
      );
    },
    [visibleTabs, mode, tokens.colors.surfaceMuted, tokens.colors.border, tabBarTopPadding]
  );

  if (!user) {
    return null;
  }

  const username = user.username;
  
  if (!username) {
    return null;
  }

  return (
    <View
      style={{
        flex: 1,
        width: screenWidth,
        paddingBottom: 12,
        backgroundColor: pageBackground,
      }}
    >
      <LinearGradient
        colors={backgroundGradient}
        style={{ ...StyleSheet.absoluteFillObject }}
      />
      <Tabs.Container
        ref={containerRef}
        renderHeader={renderHeader}
        headerHeight={headerHeight || 360}
        renderTabBar={renderTabBar}
        initialTabName={visibleTabs[0]?.key}
        lazy
        snapThreshold={0.2}
        width={screenWidth}
      >
        {visibleTabs.map((tab) => {
          // Render tab content - lazy loaded components wrapped in Suspense
          const props = { username, isOwnProfile, isAuthenticated };
          let TabComponent: React.ComponentType<any> | null = null;
          
          switch (tab.key) {
            case 'all':
              TabComponent = ProfileActivityAllTab;
              break;
            case 'topics':
              TabComponent = ProfileActivityTopicsTab;
              break;
            case 'replies':
              TabComponent = ProfileActivityRepliesTab;
              break;
            case 'read':
              TabComponent = ProfileActivityReadTab;
              break;
            case 'drafts':
              TabComponent = ProfileActivityDraftsTab;
              break;
            case 'likes':
              TabComponent = ProfileActivityLikesTab;
              break;
            case 'bookmarked':
              TabComponent = ProfileActivityBookmarkedTab;
              break;
            case 'solved':
              TabComponent = ProfileActivitySolvedTab;
              break;
            case 'votes':
              TabComponent = ProfileActivityVotesTab;
              break;
          }

          return (
            <Tabs.Tab name={tab.key} key={tab.key}>
              <Tabs.ScrollView
                // Removed nestedScrollEnabled - it causes scroll conflicts with parent
                // The collapsible tab view handles nested scrolling internally
                contentContainerStyle={{
                  width: '100%',
                  backgroundColor: pageBackground,
                }}
                style={{ width: '100%', backgroundColor: pageBackground }}
                scrollEventThrottle={100}
                showsVerticalScrollIndicator={false}
              >
                <Suspense fallback={<TabLoadingFallback />}>
                  <View style={{ width: '100%' }}>
                    {TabComponent ? <TabComponent {...props} /> : null}
                  </View>
                </Suspense>
              </Tabs.ScrollView>
            </Tabs.Tab>
          );
        })}
      </Tabs.Container>
    </View>
  );
}
