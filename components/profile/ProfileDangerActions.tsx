// UI Spec: ProfileDangerActions
// - Report user → opens sheet with reasons
// - Mute user
// - Ignore user
// - Red titles, minimalistic design
// - Only shown in PublicProfile mode

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Flag, BellSlash, EyeSlash } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';

export interface ProfileDangerActionsProps {
  username: string;
  onReport?: () => void;
  onMute?: () => void;
  onIgnore?: () => void;
}

export function ProfileDangerActions({
  username,
  onReport,
  onMute,
  onIgnore,
}: ProfileDangerActionsProps) {
  const { isDark, isAmoled } = useTheme();

  const handleReport = () => {
    if (onReport) {
      onReport();
    } else {
      // Default implementation
      Alert.alert(
        'Report User',
        `Report ${username}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Report',
            style: 'destructive',
            onPress: () => {
              Alert.alert('Reported', 'Thank you for your report.');
            },
          },
        ]
      );
    }
  };

  const handleMute = () => {
    if (onMute) {
      onMute();
    } else {
      Alert.alert(
        'Mute User',
        `Mute ${username}? You won't see their posts in your feed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mute',
            style: 'destructive',
            onPress: () => {
              Alert.alert('Muted', `${username} has been muted.`);
            },
          },
        ]
      );
    }
  };

  const handleIgnore = () => {
    if (onIgnore) {
      onIgnore();
    } else {
      Alert.alert(
        'Ignore User',
        `Ignore ${username}? You won't see their posts or replies.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Ignore',
            style: 'destructive',
            onPress: () => {
              Alert.alert('Ignored', `${username} has been ignored.`);
            },
          },
        ]
      );
    }
  };

  return (
    <View className="px-4 py-6">
      <View
        className="rounded-xl border p-4"
        style={{
          backgroundColor: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
          borderColor: isDark ? '#374151' : '#e5e7eb',
        }}
      >
        <Text
          className="text-base font-semibold mb-4"
          style={{ color: isDark ? '#ef4444' : '#dc2626' }}
        >
          Danger Zone
        </Text>

        <TouchableOpacity
          onPress={handleReport}
          className="flex-row items-center py-3 border-b"
          style={{ borderBottomColor: isDark ? '#374151' : '#e5e7eb' }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Report user"
        >
          <Flag
            size={20}
            color={isDark ? '#ef4444' : '#dc2626'}
            weight="regular"
          />
          <Text
            className="text-base font-medium ml-3"
            style={{ color: isDark ? '#ef4444' : '#dc2626' }}
          >
            Report User
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleMute}
          className="flex-row items-center py-3 border-b"
          style={{ borderBottomColor: isDark ? '#374151' : '#e5e7eb' }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Mute user"
        >
          <BellSlash
            size={20}
            color={isDark ? '#ef4444' : '#dc2626'}
            weight="regular"
          />
          <Text
            className="text-base font-medium ml-3"
            style={{ color: isDark ? '#ef4444' : '#dc2626' }}
          >
            Mute User
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleIgnore}
          className="flex-row items-center py-3"
          accessible
          accessibilityRole="button"
          accessibilityLabel="Ignore user"
        >
          <EyeSlash
            size={20}
            color={isDark ? '#ef4444' : '#dc2626'}
            weight="regular"
          />
          <Text
            className="text-base font-medium ml-3"
            style={{ color: isDark ? '#ef4444' : '#dc2626' }}
          >
            Ignore User
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

