// UI Spec: ProfileActions
// - MyProfile mode: Edit Profile button, Settings accessible via header menu
// - PublicProfile mode: Message (greyed out + "Coming soon"), Follow (hidden), Share (greyed out + "Coming soon"), Report (active), Block (active)
// - Row of buttons under stats
// - Uses NativeWind button styles

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { PencilSimple, Envelope, Share, Flag, Prohibit } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { useAuth } from '@/shared/auth-context';
import { router } from 'expo-router';

export interface ProfileActionsProps {
  mode: 'myProfile' | 'publicProfile';
  username?: string; // For public profile actions
  onReport?: () => void;
  onBlock?: () => void;
}

export function ProfileActions({
  mode,
  username,
  onReport,
  onBlock,
}: ProfileActionsProps) {
  const { isDark, isAmoled } = useTheme();
  const { isAuthenticated } = useAuth();

  const handleEditProfile = () => {
    router.push('/(profile)/edit-profile' as any);
  };

  const handleSettings = () => {
    router.push('/(profile)/settings' as any);
  };

  if (mode === 'myProfile') {
    return (
      <View className="px-4 py-3 flex-row gap-3" style={{ width: '100%', overflow: 'hidden' }}>
        <TouchableOpacity
          onPress={handleEditProfile}
          className="flex-1 py-3 px-4 rounded-xl border items-center justify-center"
          style={{
            backgroundColor: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
            borderColor: isDark ? '#374151' : '#e5e7eb',
          }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Edit Profile"
        >
          <PencilSimple
            size={20}
            color={isDark ? '#3b82f6' : '#2563eb'}
            weight="regular"
          />
          <Text
            className="text-sm font-semibold mt-1"
            style={{ color: isDark ? '#3b82f6' : '#2563eb' }}
          >
            Edit Profile
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // PublicProfile mode
  return (
    <View className="px-4 py-3 flex-row gap-2 flex-wrap" style={{ width: '100%', overflow: 'hidden' }}>
      {/* Message - Coming soon - only show if authenticated */}
      {isAuthenticated && (
      <TouchableOpacity
        disabled
        className="flex-1 min-w-[100px] py-2.5 px-3 rounded-xl border items-center justify-center"
        style={{
          backgroundColor: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
          borderColor: isDark ? '#374151' : '#e5e7eb',
          opacity: 0.5,
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Message (Coming soon)"
      >
        <Envelope
          size={18}
          color={isDark ? '#9ca3af' : '#6b7280'}
          weight="regular"
        />
        <Text
          className="text-xs font-medium mt-1"
          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
        >
          Message
        </Text>
        <Text
          className="text-xs mt-0.5"
          style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
        >
          Coming soon
        </Text>
      </TouchableOpacity>
      )}

      {/* Share - Coming soon */}
      <TouchableOpacity
        disabled
        className="flex-1 min-w-[100px] py-2.5 px-3 rounded-xl border items-center justify-center"
        style={{
          backgroundColor: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
          borderColor: isDark ? '#374151' : '#e5e7eb',
          opacity: 0.5,
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Share (Coming soon)"
      >
        <Share
          size={18}
          color={isDark ? '#9ca3af' : '#6b7280'}
          weight="regular"
        />
        <Text
          className="text-xs font-medium mt-1"
          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
        >
          Share
        </Text>
        <Text
          className="text-xs mt-0.5"
          style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
        >
          Coming soon
        </Text>
      </TouchableOpacity>

      {/* Report - only show if authenticated */}
      {isAuthenticated && onReport && (
      <TouchableOpacity
        onPress={onReport}
        className="flex-1 min-w-[100px] py-2.5 px-3 rounded-xl border items-center justify-center"
        style={{
          backgroundColor: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
          borderColor: isDark ? '#374151' : '#e5e7eb',
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Report user"
      >
        <Flag
          size={18}
          color={isDark ? '#ef4444' : '#dc2626'}
          weight="regular"
        />
        <Text
          className="text-xs font-medium mt-1"
          style={{ color: isDark ? '#ef4444' : '#dc2626' }}
        >
          Report
        </Text>
      </TouchableOpacity>
      )}

      {/* Block - only show if authenticated */}
      {isAuthenticated && onBlock && (
      <TouchableOpacity
        onPress={onBlock}
        className="flex-1 min-w-[100px] py-2.5 px-3 rounded-xl border items-center justify-center"
        style={{
          backgroundColor: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
          borderColor: isDark ? '#374151' : '#e5e7eb',
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Block user"
      >
        <Prohibit
          size={18}
          color={isDark ? '#ef4444' : '#dc2626'}
          weight="regular"
        />
        <Text
          className="text-xs font-medium mt-1"
          style={{ color: isDark ? '#ef4444' : '#dc2626' }}
        >
          Block
        </Text>
      </TouchableOpacity>
      )}
    </View>
  );
}

