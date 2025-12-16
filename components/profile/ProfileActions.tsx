// UI Spec: ProfileActions
// - MyProfile mode: Edit Profile button, Settings accessible via header menu
// - PublicProfile mode: Message (greyed out + "Coming soon"), Follow (hidden), Share (greyed out + "Coming soon"), Report (active), Block (active)
// - Row of buttons under stats
// - Uses NativeWind button styles

import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { useAuth } from '@/shared/auth-context';
import { getTokens } from '@/shared/design/tokens';
import { FluidChip } from '@/shared/ui/FluidChip';
import { FluidSection } from '@/shared/ui/FluidSection';

export interface ProfileActionsProps {
  mode: 'myProfile' | 'publicProfile';
  username?: string; // For public profile actions
  onReport?: () => void;
  onBlock?: () => void;
}

export function ProfileActions({
  mode,
  username: _username,
  onReport,
  onBlock,
}: ProfileActionsProps) {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const themeMode = isDark ? 'dark' : 'light';
  const tokens = useMemo(() => getTokens(themeMode), [themeMode]);

  const withHaptics = useCallback((action?: () => void) => {
    return () => {
      Haptics.selectionAsync().catch(() => {});
      action?.();
    };
  }, []);

  if (mode === 'myProfile') {
    return null;
  }

  // PublicProfile mode
  return (
    <View className="px-4 py-2" style={{ width: '100%' }}>
      <FluidSection
        mode={themeMode}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 12,
          gap: 12,
          alignItems: 'center',
        }}
      >
        <View className="flex-row flex-wrap gap-8" style={{ justifyContent: 'center' }}>
          {/* Message - Coming soon - only show if authenticated */}
          {isAuthenticated && (
            <View pointerEvents="none">
              <FluidChip
                label="Message"
                onPress={undefined}
                mode={themeMode}
                style={{
                  minWidth: 120,
                  backgroundColor: tokens.colors.surfaceMuted,
                  borderColor: tokens.colors.border,
                }}
              />
            </View>
          )}

          {/* Share - Coming soon */}
          <View pointerEvents="none">
            <FluidChip
              label="Share"
              onPress={undefined}
              mode={themeMode}
              style={{
                minWidth: 120,
                backgroundColor: tokens.colors.surfaceMuted,
                borderColor: tokens.colors.border,
              }}
            />
          </View>

          {/* Report - only show if authenticated */}
          {isAuthenticated && onReport && (
            <FluidChip
              label="Report"
              onPress={withHaptics(onReport)}
              mode={themeMode}
              style={{
                minWidth: 120,
                backgroundColor: tokens.colors.accent,
                borderColor: tokens.colors.accent,
              }}
            />
          )}

          {/* Block - only show if authenticated */}
          {isAuthenticated && onBlock && (
            <FluidChip
              label="Block"
              onPress={withHaptics(onBlock)}
              mode={themeMode}
              style={{
                minWidth: 120,
                backgroundColor: tokens.colors.accent,
                borderColor: tokens.colors.accent,
              }}
            />
          )}
        </View>
      </FluidSection>
    </View>
  );
}
