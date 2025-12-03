// UI Spec: ProfileTabBar
// - Icon-only tabs for small mobile screens
// - Active tab shows icon + label underneath
// - Animated underline indicator
// - Theme-aware colors using semantic tokens
// - AMOLED dark mode support
// - Haptic feedback on tab change

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
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
import { cn } from '@/lib/utils/cn';

export interface TabItem {
  key: string;
  title: string;
  icon?: React.ComponentType<any>; // Phosphor icon component
}

export interface ProfileTabBarProps {
  tabs: TabItem[];
  activeIndex?: number;
  onTabChange?: (index: number) => void;
  // CollapsibleTabView tab bar props
  index?: number;
  setIndex?: (index: number) => void;
  tabNames?: readonly string[];
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Icon mapping for tab keys (fallback if icon not provided)
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  all: List,
  topics: Article,
  replies: ChatCircle,
  read: Eye,
  drafts: NotePencil,
  likes: Heart,
  bookmarked: BookmarkSimple,
  solved: CheckCircle,
  votes: ThumbsUp,
};

export function ProfileTabBar({
  tabs,
  activeIndex: activeIndexProp,
  onTabChange: onTabChangeProp,
  index,
  setIndex,
  tabNames,
}: ProfileTabBarProps) {
  const { isDark, isAmoled } = useTheme();
  const { width } = useWindowDimensions();
  
  // Use CollapsibleTabView props if available, otherwise use direct props
  const activeIndex = index ?? activeIndexProp ?? 0;
  const handleTabChange = setIndex ?? onTabChangeProp ?? (() => {});
  
  // Use tabNames if provided (from CollapsibleTabView), otherwise use tabs
  const effectiveTabs = useMemo(() => 
    tabNames 
      ? tabs.filter(tab => tabNames.includes(tab.key))
      : tabs,
    [tabNames, tabs]
  );
  
  const tabWidth = useMemo(() => 
    effectiveTabs.length > 0 ? width / effectiveTabs.length : width,
    [effectiveTabs.length, width]
  );
  
  // Initialize shared value with a stable initial value (0)
  // Always update it via useEffect to avoid reading during render
  const indicatorPosition = useSharedValue(0);
  const isInitialMount = useRef(true);

  // Update indicator position when activeIndex changes
  React.useEffect(() => {
    if (isInitialMount.current) {
      // Set initial value immediately without animation
      indicatorPosition.value = activeIndex;
      isInitialMount.current = false;
    } else {
      // Animate subsequent changes
      indicatorPosition.value = withTiming(activeIndex, {
        duration: 250,
      });
    }
  }, [activeIndex, indicatorPosition]);

  const handleTabPress = useCallback(
    (index: number) => {
      Haptics.selectionAsync().catch(() => {});
      handleTabChange(index);
    },
    [handleTabChange]
  );

  // Pre-compute interpolation ranges to avoid computing during render
  const maxIndex = useMemo(() => Math.max(0, effectiveTabs.length - 1), [effectiveTabs.length]);
  const maxTranslateX = useMemo(() => maxIndex * tabWidth, [maxIndex, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => {
    // Access maxIndex and maxTranslateX from closure - they're stable due to useMemo
    const translateX = interpolate(
      indicatorPosition.value,
      [0, maxIndex],
      [0, maxTranslateX]
    );
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View
      className={cn(
        'flex-row border-b',
        isAmoled ? 'bg-fomio-bg-dark border-fomio-border-soft-dark' : isDark
          ? 'bg-fomio-card-dark border-fomio-border-soft-dark'
          : 'bg-fomio-bg border-fomio-border-soft'
      )}
    >
      {effectiveTabs.map((tab, index) => {
        const isActive = index === activeIndex;
        const IconComponent = tab.icon || ICON_MAP[tab.key] || List;
        
        return (
          <AnimatedPressable
            key={tab.key}
            onPress={() => handleTabPress(index)}
            className="flex-1 items-center justify-center"
            style={{ minHeight: 56, paddingVertical: 8 }}
            hitSlop={8}
            accessible
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.title}
          >
            <View className="items-center justify-center">
              <IconComponent
                size={22}
                color={
                  isActive
                    ? isAmoled
                      ? '#3B82F6'
                      : isDark
                        ? '#3B82F6'
                        : '#2563EB'
                    : isAmoled
                      ? '#A1A1AA'
                      : isDark
                        ? '#A1A1AA'
                        : '#6B6B72'
                }
                weight={isActive ? 'fill' : 'regular'}
              />
              {/* Show label only when active */}
              {isActive && (
                <Text
                  className={cn(
                    'text-xs font-semibold mt-1',
                    isAmoled
                      ? 'text-fomio-primary-dark'
                      : isDark
                        ? 'text-fomio-primary-dark'
                        : 'text-fomio-primary'
                  )}
                  numberOfLines={1}
                >
                  {tab.title}
                </Text>
              )}
            </View>
          </AnimatedPressable>
        );
      })}
      <Animated.View
        className={cn(
          'absolute bottom-0 h-0.5',
          isAmoled
            ? 'bg-fomio-primary-dark'
            : isDark
              ? 'bg-fomio-primary-dark'
              : 'bg-fomio-primary'
        )}
        style={[
          {
            width: tabWidth,
            left: 0,
          },
          indicatorStyle,
        ]}
      />
    </View>
  );
}

