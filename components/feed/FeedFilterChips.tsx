import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Clock, Fire, Bell, Hash } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';
import { Hub } from '@/shared/discourseApi';
import { cn } from '@/lib/utils/cn';

export interface FeedFilterChipsProps {
  activeSort: 'latest' | 'hot' | 'unread';
  onSortChange: (sort: 'latest' | 'hot' | 'unread') => void;
  activeHubId?: number;
  onHubChange: (hubId: number | undefined) => void;
  hubs: Hub[];
  isAuthenticated: boolean;
}

/**
 * FeedFilterChips - Horizontal scrollable filter chips for feed sorting and category filtering
 * 
 * UI Spec:
 * - Sort chips: Latest, Hot, Unread (hide Unread if not authenticated)
 * - Hub chips: "All" + list of hubs
 * - Icons: Clock (Latest), Fire (Hot), Bell (Unread), Hash (categories)
 * - Active state: accent color with opacity background
 * - Haptic feedback on press
 * - Touch-safe targets (min 44px height)
 */
export function FeedFilterChips({
  activeSort,
  onSortChange,
  activeHubId,
  onHubChange,
  hubs,
  isAuthenticated,
}: FeedFilterChipsProps) {
  const { themeMode, isDark } = useTheme();
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

  const handleSortPress = useCallback((sort: 'latest' | 'hot' | 'unread') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSortChange(sort);
  }, [onSortChange]);

  const handleHubPress = useCallback((hubId: number | undefined) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onHubChange(hubId);
  }, [onHubChange]);

  const renderSortChip = useCallback((
    sort: 'latest' | 'hot' | 'unread',
    label: string,
    icon: React.ReactNode
  ) => {
    // Hide Unread if not authenticated
    if (sort === 'unread' && !isAuthenticated) {
      return null;
    }

    const isActive = activeSort === sort;
    return (
      <TouchableOpacity
        key={sort}
        onPress={() => handleSortPress(sort)}
        className={cn(
          'px-4 py-2 rounded-full border flex-row items-center gap-2',
          isActive && 'bg-opacity-20'
        )}
        style={{
          backgroundColor: isActive ? `${colors.accent}20` : 'transparent',
          borderColor: isActive ? colors.accent : colors.border,
          marginRight: 8,
          minHeight: 44,
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Filter by ${label}`}
        accessibilityState={{ selected: isActive }}
      >
        {icon}
        <Text
          className="text-sm font-semibold"
          style={{ color: isActive ? colors.accent : colors.foreground }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }, [activeSort, colors, isAuthenticated, handleSortPress]);

  const renderHubChip = useCallback((hub: Hub | null) => {
    const hubId = hub?.id;
    const isActive = activeHubId === hubId;
    const label = hub ? hub.name : 'All';
    const chipColor = hub?.color || colors.accent;

    return (
      <TouchableOpacity
        key={hubId || 'all'}
        onPress={() => handleHubPress(hubId)}
        className={cn(
          'px-4 py-2 rounded-full border flex-row items-center gap-2',
          isActive && 'bg-opacity-20'
        )}
        style={{
          backgroundColor: isActive ? `${chipColor}20` : 'transparent',
          borderColor: isActive ? chipColor : colors.border,
          marginRight: 8,
          minHeight: 44,
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Filter by ${label}`}
        accessibilityState={{ selected: isActive }}
      >
        <Hash size={14} color={isActive ? chipColor : colors.foreground} weight={isActive ? 'fill' : 'regular'} />
        <Text
          className="text-sm font-semibold"
          style={{ color: isActive ? chipColor : colors.foreground }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }, [activeHubId, colors, handleHubPress]);

  return (
    <View 
      className="border-b"
      style={{ 
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      {/* Sort chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 py-3"
        contentContainerStyle={{ gap: 8 }}
      >
        {renderSortChip('latest', 'Latest', <Clock size={16} color={activeSort === 'latest' ? colors.accent : colors.foreground} weight={activeSort === 'latest' ? 'fill' : 'regular'} />)}
        {renderSortChip('hot', 'Hot', <Fire size={16} color={activeSort === 'hot' ? colors.accent : colors.foreground} weight={activeSort === 'hot' ? 'fill' : 'regular'} />)}
        {renderSortChip('unread', 'Unread', <Bell size={16} color={activeSort === 'unread' ? colors.accent : colors.foreground} weight={activeSort === 'unread' ? 'fill' : 'regular'} />)}
      </ScrollView>

      {/* Hub chips */}
      {hubs.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 pb-3"
          contentContainerStyle={{ gap: 8 }}
        >
          {renderHubChip(null)}
          {hubs.map((hub) => renderHubChip(hub))}
        </ScrollView>
      )}
    </View>
  );
}

