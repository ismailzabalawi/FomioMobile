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
  useAnimatedReaction,
  withSpring,
  interpolate,
  SharedValue,
  runOnJS,
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
import { getTokens } from '@/shared/design/tokens';
import { FluidSlotBar } from '@/shared/ui/FluidSlotBar';

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
  indexSharedValue?: SharedValue<number>;
  onTabPress?: (tabName: string) => void;
  tabNames?: readonly string[];
  showEditAction?: boolean;
  onEditPress?: () => void;
  editLabel?: string;
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
  indexSharedValue,
  onTabPress,
  tabNames,
  showEditAction = false,
  onEditPress,
  editLabel = 'Edit',
}: ProfileTabBarProps) {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const mode = isDark ? 'dark' : 'light';
  const tokens = useMemo(() => getTokens(mode), [mode]);
  const [barWidth, setBarWidth] = React.useState(width);
  
  // Track current index - either from SharedValue or prop
  const [currentIndex, setCurrentIndex] = React.useState(() => {
    if (indexSharedValue) {
      return Math.round(indexSharedValue.value);
    }
    return activeIndexProp ?? 0;
  });
  
  // Sync SharedValue changes to state
  useAnimatedReaction(
    () => indexSharedValue?.value,
    (value) => {
      if (value !== undefined) {
        runOnJS(setCurrentIndex)(Math.round(value));
      }
    },
    [indexSharedValue]
  );
  
  // Use current index (from SharedValue) or fallback to prop
  const activeIndex = indexSharedValue !== undefined ? currentIndex : (activeIndexProp ?? 0);
  
  // Use tabNames if provided (from CollapsibleTabView), otherwise use tabs
  const effectiveTabs = useMemo(() => 
    tabNames 
      ? tabs.filter(tab => tabNames.includes(tab.key))
      : tabs,
    [tabNames, tabs]
  );

  const containerPadding = 8;
  const slotGap = 8;
  const tabWidth = useMemo(() => {
    if (effectiveTabs.length === 0) return barWidth;
    const paddedWidth = Math.max(0, barWidth - containerPadding * 2);
    const totalGap = slotGap * Math.max(effectiveTabs.length - 1, 0);
    const availableWidth = Math.max(0, paddedWidth - totalGap);
    return availableWidth / effectiveTabs.length;
  }, [effectiveTabs.length, barWidth]);
  
  // Initialize shared value with a stable initial value (0)
  // Always update it via useEffect to avoid reading during render
  const indicatorPosition = useSharedValue(activeIndex);
  const isInitialMount = useRef(true);

  // Update indicator position when activeIndex changes
  React.useEffect(() => {
    if (isInitialMount.current) {
      // Set initial value immediately without animation
      indicatorPosition.value = activeIndex;
      isInitialMount.current = false;
    } else {
      // Animate subsequent changes
      indicatorPosition.value = withSpring(activeIndex, tokens.motion.liquidSpring);
    }
  }, [activeIndex, indicatorPosition, tokens.motion.liquidSpring]);

  const handleTabPress = useCallback(
    (tabIndex: number) => {
      Haptics.selectionAsync().catch(() => {});
      
      const tab = effectiveTabs[tabIndex];
      if (!tab) return;
      
      // Use onTabPress with tab name for proper tab switching in collapsible-tab-view
      if (onTabPress) {
        onTabPress(tab.key);
      } else if (onTabChangeProp) {
        // Fallback to custom handler with index
        onTabChangeProp(tabIndex);
      }
    },
    [onTabPress, onTabChangeProp, effectiveTabs]
  );

  // Pre-compute interpolation ranges to avoid computing during render
  const maxIndex = useMemo(() => Math.max(0, effectiveTabs.length - 1), [effectiveTabs.length]);
  const indicatorWidth = useMemo(() => {
    const target = tabWidth * 0.7;
    const maxWidth = Math.max(16, tabWidth - 6);
    const minWidth = Math.min(32, maxWidth);
    return Math.max(minWidth, Math.min(target, maxWidth));
  }, [tabWidth]);
  const tabStep = tabWidth + slotGap;

  const handleEditPress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    onEditPress?.();
  }, [onEditPress]);

  const indicatorStyle = useAnimatedStyle(() => {
    // Access maxIndex and maxTranslateX from closure - they're stable due to useMemo
    const translateX = interpolate(
      indicatorPosition.value,
      [0, maxIndex],
      [0, tabStep * maxIndex]
    );
    return {
      transform: [
        {
          translateX:
            containerPadding +
            translateX +
            Math.max(0, (tabWidth - indicatorWidth) / 2),
        },
      ],
    };
  });

  const handleLayout = useCallback((event: any) => {
    const nextWidth = event?.nativeEvent?.layout?.width;
    if (nextWidth && Math.abs(nextWidth - barWidth) > 1) {
      setBarWidth(nextWidth);
    }
  }, [barWidth]);

  return (
    <View style={{ width: '100%' }} onLayout={handleLayout}>
      <FluidSlotBar
        mode={mode}
        height={58}
        radius={tokens.radii.lg}
        slots={[
          {
            key: 'tabs',
            flex: 1,
            render: () => (
              <View
                className="flex-row"
                style={{
                  width: '100%',
                  height: '100%',
                  paddingHorizontal: containerPadding,
                  alignItems: 'center',
                }}
              >
                {effectiveTabs.map((tab, index) => {
                  const isActive = index === activeIndex;
                  const IconComponent = tab.icon || ICON_MAP[tab.key] || List;
                  
                  return (
                    <AnimatedPressable
                      key={tab.key}
                      onPress={() => handleTabPress(index)}
                      className="items-center justify-center"
                      style={{
                        minHeight: 52,
                        paddingVertical: 6,
                        width: tabWidth,
                        marginRight: index === effectiveTabs.length - 1 ? 0 : slotGap,
                      }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessible
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={tab.title}
                    >
                      <View className="items-center justify-center" pointerEvents="none">
                        <IconComponent
                          size={22}
                          color={isActive ? tokens.colors.accent : tokens.colors.muted}
                          weight={isActive ? 'fill' : 'regular'}
                        />
                        {/* Show label only when active */}
                        {isActive && (
                          <Text
                            className="text-xs font-semibold mt-1"
                            style={{ color: tokens.colors.accent }}
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
                  className="absolute bottom-1.5"
                  style={[
                    {
                      width: indicatorWidth,
                      height: 3,
                      left: 0,
                      borderRadius: tokens.radii.pill,
                      backgroundColor: tokens.colors.accent,
                    },
                    indicatorStyle,
                  ]}
                  pointerEvents="none"
                />
              </View>
            ),
          },
          {
            key: 'edit',
            width: showEditAction ? 120 : 0,
            visible: showEditAction,
            render: () => (
              <AnimatedPressable
                onPress={handleEditPress}
                className="items-center justify-center"
                style={{
                  paddingHorizontal: 8,
                  height: 64,
                  minWidth: 120,
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={editLabel}
              >
                <View
                  style={{
                    backgroundColor: tokens.colors.accent,
                    borderColor: tokens.colors.accent,
                    borderWidth: 1,
                    borderRadius: tokens.radii.pill,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: '#ffffff' }}
                  >
                    {editLabel}
                  </Text>
                </View>
              </AnimatedPressable>
            ),
          },
        ]}
      />
    </View>
  );
}
