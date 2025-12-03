// UI Spec: ProfileTabView
// - Collapsible tab view with Twitter/X-style tabs
// - Profile header collapses on scroll
// - Tabs: All, Topics, Replies, Read, Drafts, Likes, Bookmarked, Solved, Votes
// - Visibility logic: Show/hide tabs based on isOwnProfile and isAuthenticated
// - Pull-to-refresh support
// - Lazy loading tabs

import React, { useMemo, useCallback } from 'react';
import { View } from 'react-native';
import { Tabs } from 'react-native-collapsible-tab-view';
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
import { ProfileHeader, ProfileBio, ProfileStats, ProfileActions } from './';
import { ProfileTabBar, TabItem } from './ProfileTabBar';
import { cn } from '@/lib/utils/cn';
import { ProfileActivityAllTab } from './tabs/ProfileActivityAllTab';
import { ProfileActivityTopicsTab } from './tabs/ProfileActivityTopicsTab';
import { ProfileActivityRepliesTab } from './tabs/ProfileActivityRepliesTab';
import { ProfileActivityReadTab } from './tabs/ProfileActivityReadTab';
import { ProfileActivityDraftsTab } from './tabs/ProfileActivityDraftsTab';
import { ProfileActivityLikesTab } from './tabs/ProfileActivityLikesTab';
import { ProfileActivityBookmarkedTab } from './tabs/ProfileActivityBookmarkedTab';
import { ProfileActivitySolvedTab } from './tabs/ProfileActivitySolvedTab';
import { ProfileActivityVotesTab } from './tabs/ProfileActivityVotesTab';

export interface ProfileTabViewProps {
  user: DiscourseUser | null;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  onReport?: () => void;
  onBlock?: () => void;
  votingEnabled?: boolean;
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
}: ProfileTabViewProps) {
  const { isDark, isAmoled } = useTheme();

  const visibleTabs = useMemo(
    () => getVisibleTabs(isOwnProfile, isAuthenticated, votingEnabled),
    [isOwnProfile, isAuthenticated, votingEnabled]
  );

  const tabNames = useMemo(() => visibleTabs.map(tab => tab.key), [visibleTabs]);

  const renderHeader = useCallback(() => {
    if (!user) return null;

    return (
      <View
        className={cn(
          isAmoled
            ? 'bg-fomio-bg-dark'
            : isDark
              ? 'bg-fomio-card-dark'
              : 'bg-fomio-card'
        )}
      >
        <ProfileHeader user={user} isPublic={!isOwnProfile} />
        <ProfileBio bio={user.bio_raw} />
        <ProfileStats user={user} />
        <ProfileActions
          mode={isOwnProfile ? 'myProfile' : 'publicProfile'}
          username={user.username}
          onReport={onReport}
          onBlock={onBlock}
        />
      </View>
    );
  }, [user, isOwnProfile, isDark, isAmoled, onReport, onBlock]);

  const renderTabBar = useCallback(
    (props: any) => {
      return (
        <ProfileTabBar
          tabs={visibleTabs}
          index={props.index}
          setIndex={props.setIndex}
          tabNames={props.tabNames}
        />
      );
    },
    [visibleTabs]
  );

  if (!user) {
    return null;
  }

  const username = user?.username;
  
  // Early return if no user or username
  if (!user || !username) {
    return null;
  }

  return (
    <View
      className={cn(
        'flex-1',
        isAmoled
          ? 'bg-fomio-bg-dark'
          : isDark
            ? 'bg-fomio-card-dark'
            : 'bg-fomio-bg'
      )}
    >
      <Tabs.Container
        renderHeader={renderHeader}
        headerHeight={400}
        renderTabBar={renderTabBar}
        initialTabName={visibleTabs[0]?.key}
        lazy
      >
        {visibleTabs.map((tab) => {
          const renderTabContent = () => {
            switch (tab.key) {
              case 'all':
                return (
                  <ProfileActivityAllTab
                    username={username}
                    isOwnProfile={isOwnProfile}
                    isAuthenticated={isAuthenticated}
                  />
                );
              case 'topics':
                return (
                  <ProfileActivityTopicsTab
                    username={username}
                    isOwnProfile={isOwnProfile}
                    isAuthenticated={isAuthenticated}
                  />
                );
              case 'replies':
                return (
                  <ProfileActivityRepliesTab
                    username={username}
                    isOwnProfile={isOwnProfile}
                    isAuthenticated={isAuthenticated}
                  />
                );
              case 'read':
                return (
                  <ProfileActivityReadTab
                    username={username}
                    isOwnProfile={isOwnProfile}
                    isAuthenticated={isAuthenticated}
                  />
                );
              case 'drafts':
                return (
                  <ProfileActivityDraftsTab
                    username={username}
                    isOwnProfile={isOwnProfile}
                    isAuthenticated={isAuthenticated}
                  />
                );
              case 'likes':
                return (
                  <ProfileActivityLikesTab
                    username={username}
                    isOwnProfile={isOwnProfile}
                    isAuthenticated={isAuthenticated}
                  />
                );
              case 'bookmarked':
                return (
                  <ProfileActivityBookmarkedTab
                    username={username}
                    isOwnProfile={isOwnProfile}
                    isAuthenticated={isAuthenticated}
                  />
                );
              case 'solved':
                return (
                  <ProfileActivitySolvedTab
                    username={username}
                    isOwnProfile={isOwnProfile}
                    isAuthenticated={isAuthenticated}
                  />
                );
              case 'votes':
                return (
                  <ProfileActivityVotesTab
                    username={username}
                    isOwnProfile={isOwnProfile}
                    isAuthenticated={isAuthenticated}
                  />
                );
              default:
                return null;
            }
          };

          return (
            <Tabs.Tab name={tab.key} key={tab.key}>
              <Tabs.ScrollView nestedScrollEnabled>
                {renderTabContent()}
              </Tabs.ScrollView>
            </Tabs.Tab>
          );
        })}
      </Tabs.Container>
    </View>
  );
}

