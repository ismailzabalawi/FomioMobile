// UI Spec: ProfileTabView
// - Collapsible tab view with Twitter/X-style tabs
// - Profile header collapses on scroll
// - Tabs: All, Topics, Replies, Read, Drafts, Likes, Bookmarked, Solved, Votes
// - Visibility logic: Show/hide tabs based on isOwnProfile and isAuthenticated
// - Pull-to-refresh support
// - Lazy loading tabs

import React, { useMemo, useCallback, useState } from 'react';
import { View, Pressable, Text, useWindowDimensions, StyleSheet } from 'react-native';
import { 
  Article, 
  ChatCircle, 
  Heart, 
  BookmarkSimple, 
} from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { DiscourseUser } from '@/shared/discourseApi';
import { ProfileHeader, ProfileBio, ProfileStats, ProfileActions } from './';
import { getTokens } from '@/shared/design/tokens';
import { ProfileActivityTopicsTab } from './tabs/ProfileActivityTopicsTab';
import { ProfileActivityRepliesTab } from './tabs/ProfileActivityRepliesTab';
import { ProfileActivityLikesTab } from './tabs/ProfileActivityLikesTab';
import { ProfileActivityBookmarkedTab } from './tabs/ProfileActivityBookmarkedTab';

export interface ProfileTabViewProps {
  user: DiscourseUser | null;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  onReport?: () => void;
  onBlock?: () => void;
}

export interface TabItem {
  key: string;
  title: string;
  icon?: React.ComponentType<any>;
}

const ALL_TABS: TabItem[] = [
  { key: 'topics', title: 'Bytes', icon: Article },
  { key: 'replies', title: 'Replies', icon: ChatCircle },
  { key: 'likes', title: 'Likes', icon: Heart },
  { key: 'bookmarked', title: 'Bookmarks', icon: BookmarkSimple },
];

function getVisibleTabs(isOwnProfile: boolean, isAuthenticated: boolean): TabItem[] {
  return ALL_TABS.filter((tab) => {
    switch (tab.key) {
      case 'topics':
      case 'replies':
        return true; // Public tabs
      case 'likes':
      case 'bookmarked':
        return isOwnProfile && isAuthenticated; // Own profile only
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
}: ProfileTabViewProps) {
  const { isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const mode = isDark ? 'dark' : 'light';
  const tokens = useMemo(() => getTokens(mode), [mode]);
  const pageBackground = mode === 'dark' ? '#000000' : '#f8fafc';
  const [activeTab, setActiveTab] = useState<string>('topics');

  const visibleTabs = useMemo(() => {
    return getVisibleTabs(isOwnProfile, isAuthenticated);
  }, [isOwnProfile, isAuthenticated]);

  const headerContainerStyle = useMemo(
    () => ({
      width: '100%' as const,
      marginTop: -8,
      backgroundColor: pageBackground,
    }),
    [pageBackground]
  );

  const renderHeader = useCallback(() => {
    if (!user) return null;

    return (
      <View 
        style={headerContainerStyle}
        pointerEvents="box-none"
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
  }, [user, isOwnProfile, onReport, onBlock, headerContainerStyle]);

  if (!user) {
    return null;
  }

  const username = user.username;
  
  if (!username) {
    return null;
  }

  const handleTabPress = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  const renderActiveTab = () => {
    const props = { username, isOwnProfile, isAuthenticated };
    switch (activeTab) {
      case 'topics':
        return <ProfileActivityTopicsTab {...props} />;
      case 'replies':
        return <ProfileActivityRepliesTab {...props} />;
      case 'likes':
        return <ProfileActivityLikesTab {...props} />;
      case 'bookmarked':
        return <ProfileActivityBookmarkedTab {...props} />;
      default:
        return null;
    }
  };

  return (
    <View
      style={{
        flex: 1,
        width: screenWidth,
        paddingBottom: 12,
        backgroundColor: pageBackground,
      }}
    >
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: pageBackground }
        ]}
      />
      {renderHeader()}
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: pageBackground,
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
          {visibleTabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleTabPress(tab.key)}
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
                accessibilityLabel={tab.title}
              >
                <Text
                  style={{
                    color: isActive ? tokens.colors.text : tokens.colors.muted,
                    fontWeight: isActive ? '600' : '500',
                    fontSize: 13,
                    letterSpacing: 0.2,
                  }}
                >
                  {tab.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {renderActiveTab()}
      </View>
    </View>
  );
}
