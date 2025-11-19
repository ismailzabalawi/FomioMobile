import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Pin, Lock, Archive, ShieldCheck } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';

export interface StatusChipsRowProps {
  isPinned?: boolean;
  isLocked?: boolean;
  isArchived?: boolean;
  isStaff?: boolean;
}

// UI Spec: StatusChipsRow — Displays status chips for topic states
// - Shows Pinned, Locked, Archived, Staff badges
// - Uses small chips with appropriate colors
// - Only displays if status is true
// - Uses Phosphor icons
// - Themed with Fomio semantic tokens
export function StatusChipsRow({
  isPinned,
  isLocked,
  isArchived,
  isStaff,
}: StatusChipsRowProps) {
  const { isDark, isAmoled } = useTheme();
  const colors = getThemeColors(isDark);

  const chips: Array<{ label: string; icon: React.ReactNode; color: string }> = [];

  if (isPinned) {
    chips.push({
      label: 'Pinned',
      icon: <Pin size={12} weight="fill" />,
      color: isDark ? '#fbbf24' : '#f59e0b',
    });
  }

  if (isLocked) {
    chips.push({
      label: 'Locked',
      icon: <Lock size={12} weight="fill" />,
      color: isDark ? '#ef4444' : '#dc2626',
    });
  }

  if (isArchived) {
    chips.push({
      label: 'Archived',
      icon: <Archive size={12} weight="fill" />,
      color: isDark ? '#6b7280' : '#4b5563',
    });
  }

  if (isStaff) {
    chips.push({
      label: 'Staff',
      icon: <ShieldCheck size={12} weight="fill" />,
      color: isDark ? '#3b82f6' : '#2563eb',
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <View className="flex-row flex-wrap items-center gap-2">
      {chips.map((chip, index) => (
        <View
          key={index}
          className="flex-row items-center px-2 py-1 rounded-full"
          style={{
            backgroundColor: chip.color + '20',
          }}
        >
          <View style={{ marginRight: 4 }}>
            {chip.icon}
          </View>
          <Text
            className="text-xs font-semibold"
            style={{ color: chip.color }}
          >
            {chip.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

