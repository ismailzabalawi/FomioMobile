// UI Spec: ProfileHeader
// - Hero band with subtle frosted fill
// - Overlapped avatar + centered name/bio to reduce wasted space
// - Joined date and last seen are displayed in stats line under bio
// - Uses tokenized radii/shadows for the fluid look

import React, { useMemo } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/theme';
import { useHeader } from '@/components/ui/header';
import { discourseApi, DiscourseUser } from '@/shared/discourseApi';
import { getTokens } from '@/shared/design/tokens';

export interface ProfileHeaderProps {
  user: DiscourseUser;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const { isDark } = useTheme();
  const { header } = useHeader();
  const insets = useSafeAreaInsets();
  const mode = isDark ? 'dark' : 'light';
  const tokens = useMemo(() => getTokens(mode), [mode]);
  
  // Calculate header height to add appropriate top padding
  const BASE_BAR_HEIGHT = Platform.OS === 'ios' ? 40 : 44;
  const HEADER_PADDING = Platform.OS === 'ios' ? 4 : 2;
  const baseHeaderHeight = BASE_BAR_HEIGHT + HEADER_PADDING;
  const measuredHeaderHeight = header.headerHeight ?? baseHeaderHeight;
  
  // When extendToStatusBar is true, header includes status bar area
  // ProfileHeader needs padding to account for the global header
  const headerTopPadding = header.extendToStatusBar 
    ? measuredHeaderHeight 
    : measuredHeaderHeight + insets.top;
  
  const avatarUrl = user.avatar_template
    ? discourseApi.getAvatarUrl(user.avatar_template, 72)
    : null;

  const displayName = user.name || user.username || 'Unknown User';
  const username = user.username || 'unknown';
  const coverUrl =
    (user as any)?.profile_background ||
    (user as any)?.card_background ||
    null;
  

  const heroHeight = 112;
  const avatarSize = 72;

  return (
    <View style={{ width: '100%' }}>
      <View
        style={{
          height: heroHeight,
          paddingTop: headerTopPadding + 4,
          borderBottomLeftRadius: tokens.radii.lg,
          borderBottomRightRadius: tokens.radii.lg,
          // Lighter, grayish hero for contrast against the black body
          backgroundColor: mode === 'dark' ? '#1b212c' : '#f8fafc',
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor: mode === 'dark' ? 'rgba(255,255,255,0.12)' : tokens.colors.border,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {coverUrl && (
          <Image
            source={{ uri: coverUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={200}
            pointerEvents="none"
            accessible
            accessibilityLabel="Profile header image"
          />
        )}
      </View>
      <View
        style={{
          marginTop: -avatarSize / 2,
          paddingHorizontal: 16,
          paddingBottom: 0,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Avatar */}
          <View
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              overflow: 'hidden',
              borderWidth: 3,
              borderColor: tokens.colors.surfaceFrost,
              ...tokens.shadows.soft,
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
                accessible
                accessibilityLabel={`${displayName}'s profile picture`}
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  backgroundColor: tokens.colors.surfaceMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '700',
                    color: tokens.colors.text,
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Name, username */}
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              className="text-xl font-semibold"
              style={{ color: tokens.colors.text }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              className="text-sm"
              style={{ color: tokens.colors.muted }}
              numberOfLines={1}
            >
              @{username}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
