import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { Tabs, router, useFocusEffect } from 'expo-router';
import { House, MagnifyingGlass, Plus, Bell, User, ArrowUp, CheckCircle, PencilSimple } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/theme';
import { View, StyleSheet, Pressable, Text, Platform, Alert, AppState, AppStateStatus } from 'react-native';
import { useNotifications } from '../../shared/useNotifications';
import { useNotificationPreferences } from '../../shared/useNotificationPreferences';
import { filterNotificationsByPreferences } from '../../lib/utils/notifications';
import { useAuth } from '@/shared/auth-context';
import { discourseApi } from '@/shared/discourseApi';
import { useSettingsStorage } from '@/shared/useSettingsStorage';
import * as Haptics from 'expo-haptics';
import { getThemeColors } from '@/shared/theme-constants';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useDerivedValue, useAnimatedStyle, withSpring, useAnimatedProps, interpolate, Extrapolate, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { FluidNavProvider, useFluidNav } from '@/shared/navigation/fluidNavContext';
import { getTokens } from '@/shared/design/tokens';
import {
  computeNeckRadius,
  computeCurvatureSpread,
  getMetaballPath,
  computeBridgeOpacity,
} from '@/shared/design/fluidDynamics';
import { TabIcon, FluidTabItem, useTabBarColors } from '@/components/nav/TabBarComponents';
import {
  INDICATOR_WIDTH,
  DROP_RADIUS,
  BAR_CAP_RADIUS,
  DROP_SIZE,
  INITIAL_GAP,
  STRETCH_LEFT,
  STRETCH_RIGHT,
  CONTAINER_HEIGHT,
  DETACH_START,
  DETACH_END,
  BUD_START_BASE,
  BUD_END_BASE,
  REAPPEAR_WINDOW,
  REAPPEAR_RESET_DELTA,
  REAPPEAR_FACTOR,
  MERGE_BRIDGE_MIN,
  MERGE_BRIDGE_MAX,
  BUD_BRIDGE_MIN,
  BUD_BRIDGE_MAX,
  ICON_SIZE,
  COMPOSE_ICON_SIZE,
  TAB_ITEM_ICON_SIZE,
  BADGE_TOP,
  BADGE_RIGHT,
  BADGE_MIN_WIDTH,
  BADGE_HEIGHT,
  BADGE_BORDER_RADIUS,
  BADGE_PADDING_HORIZONTAL,
  BADGE_FONT_SIZE,
  BADGE_FONT_WEIGHT,
  BADGE_LINE_HEIGHT,
  TAB_HIT_SLOP,
  TAB_BAR_HORIZONTAL_PADDING_BASE,
} from '@/shared/navigation/tabBarConstants';

// ============================================================================
// SCREEN TYPES FOR CONTEXT-AWARE NAVIGATION
// ============================================================================
type ScreenType = 'feed' | 'search' | 'notifications' | 'profile';
type RightActionType = 'scroll-to-top' | 'mark-all-read' | 'edit-profile' | 'none';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Fluid dynamics functions imported from shared/design/fluidDynamics.ts

// Tab bar components imported from components/nav/TabBarComponents.tsx

/**
 * CustomTabBar - Fluid navigation tab bar with physics-based animations
 * 
 * Implements a three-part floating tab bar with:
 * - Compose button (left): Merges into bar on scroll down, reappears on scroll up
 * - Main tab bar (center): Expands/contracts based on compose and action button visibility
 * - Right action button: Buds from bar on scroll (scroll-to-top, mark-all-read, or edit-profile)
 * 
 * Uses fluid dynamics physics for smooth liquid bridge animations between elements.
 * Context-aware right action adapts based on current screen (feed/search/notifications/profile).
 * 
 * @param state - Navigation state from Expo Router
 * @param descriptors - Route descriptors
 * @param navigation - Navigation object
 * @param unreadCount - Number of unread notifications for badge
 * @param markAllAsRead - Callback to mark all notifications as read
 * @param hasUnreadNotifications - Whether there are unread notifications
 * @param isAuthenticated - Whether user is authenticated
 */
function CustomTabBar({
  state,
  descriptors,
  navigation,
 unreadCount,
 markAllAsRead,
 hasUnreadNotifications,
 isAuthenticated,
  draftCount = 0,
  showDraftBadge = false,
}: any) {
  // Constants imported from tabBarConstants.ts
  const insets = useSafeAreaInsets();
  const horizontalPadding = Math.max(insets.left, insets.right, TAB_BAR_HORIZONTAL_PADDING_BASE);
  const { isDark, isAmoled } = useTheme();
  const { scrollY, triggerUp } = useFluidNav();
  const colors = useTabBarColors(isDark, isAmoled);
  // Get tokens for blur, shadows, and surface backgrounds
  const tokens = useMemo(() => getTokens(isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'), [isDark, isAmoled]);
  // Surface background from tokens (platform-specific)
  const surfaceBg = tokens.surfaceBg;
  const gooFill = 'transparent';

  const containerWidth = useSharedValue(0);
  const indicatorIndex = useSharedValue(0);
  const isProfileEditAction = useSharedValue(0);
  const budStart = useSharedValue(BUD_START_BASE);
  const budEnd = useSharedValue(BUD_END_BASE);
  const [composePointerEvents, setComposePointerEvents] = useState<'auto' | 'none'>('auto');
  const [upPointerEvents, setUpPointerEvents] = useState<'auto' | 'none'>('none');
  // Track downward anchor to let compose reappear when scrolling up without reaching top
  const composeReappearOrigin = useSharedValue(0);
  const composeReappearBoost = useDerivedValue(() => {
    const y = scrollY.value;
    const delta = y - composeReappearOrigin.value;
    if (delta > REAPPEAR_RESET_DELTA) {
      composeReappearOrigin.value = y;
      return 0;
    }
    const climb = composeReappearOrigin.value - y;
    return interpolate(climb, [0, REAPPEAR_WINDOW], [0, 1], Extrapolate.CLAMP);
  });

  const visibleRoutes = useMemo(
    () => state.routes.filter((r: any) => r.name !== 'compose'),
    [state.routes]
  );

  useEffect(() => {
    const activeKey = state.routes[state.index]?.key;
    const idx = visibleRoutes.findIndex((r: any) => r.key === activeKey);
    indicatorIndex.value = idx;
  }, [state.index, state.routes, visibleRoutes, indicatorIndex]);

  // ============================================================================
  // SCREEN DETECTION & CONTEXT-AWARE RIGHT ACTION
  // Determines current screen type and appropriate right action button
  // ============================================================================
  
  // Get current screen name
  const currentScreenName = state.routes[state.index]?.name || 'index';
  
  // Determine screen type
  const screenType: ScreenType = useMemo(() => {
    switch (currentScreenName) {
      case 'index':
        return 'feed';
      case 'search':
        return 'search';
      case 'notifications':
        return 'notifications';
      case 'profile':
        return 'profile';
      default:
        return 'feed';
    }
  }, [currentScreenName]);
  
  // For profile screen: Check if viewing own profile
  // Currently the profile tab always shows own profile, but this guards for future route params
  const isViewingOwnProfile = useMemo(() => {
    // Profile tab always shows current user's profile in this implementation
    // This can be extended later when viewing other users' profiles
    return screenType === 'profile';
  }, [screenType]);
  
  // Determine what right action button to show
  const rightActionType: RightActionType = useMemo(() => {
    switch (screenType) {
      case 'feed':
      case 'search':
        return 'scroll-to-top';
      case 'notifications':
        return 'mark-all-read';
      case 'profile':
        return isViewingOwnProfile ? 'edit-profile' : 'none';
      default:
        return 'scroll-to-top';
    }
  }, [screenType, isViewingOwnProfile]);

  // Adjust bud thresholds per action (edit profile should appear sooner)
  useEffect(() => {
    if (rightActionType === 'edit-profile') {
      budStart.value = 0;
      budEnd.value = 90;
      isProfileEditAction.value = 1;
    } else {
      budStart.value = BUD_START_BASE;
      budEnd.value = BUD_END_BASE;
      isProfileEditAction.value = 0;
    }
  }, [rightActionType, budStart, budEnd, isProfileEditAction]);

  // ============================================================================
  // RIGHT ACTION HANDLERS
  // Context-aware handlers for the right floating button
  // ============================================================================
  
  // Scroll to top handler (feed/search)
  const handleScrollToTop = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    console.log('[TabBar] Scroll-to-top button pressed, calling triggerUp()');
    triggerUp(); // Calls the handler registered by the currently active screen
  }, [triggerUp]);
  
  // Mark all notifications as read handler (notifications)
  const handleMarkAllRead = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (hasUnreadNotifications && markAllAsRead) {
      Alert.alert('Mark All as Read', 'Mark all notifications as read?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Read',
          onPress: async () => {
            console.log('[TabBar] Mark all read confirmed, calling API');
            try {
              await markAllAsRead();
              console.log('[TabBar] Mark all read completed successfully');
            } catch (error) {
              console.error('[TabBar] Mark all read failed:', error);
            }
          },
        },
      ]);
    }
  }, [hasUnreadNotifications, markAllAsRead]);
  
  // Edit profile handler (profile)
  const handleEditProfile = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/(profile)/edit-profile');
  }, []);
  
  // Determine if the right action is disabled
  const isRightActionDisabled = useMemo(() => {
    switch (rightActionType) {
      case 'mark-all-read':
        // Disable "Mark all read" when there are no unread notifications
        return !hasUnreadNotifications;
      case 'edit-profile':
        // Disable "Edit Profile" when not authenticated
        return !isAuthenticated;
      default:
        return false;
    }
  }, [rightActionType, hasUnreadNotifications, isAuthenticated]);
  
  // Get the appropriate handler based on screen context
  const getRightActionHandler = useCallback(() => {
    // Return no-op if action is disabled
    if (isRightActionDisabled) {
      return () => {
        // Subtle haptic feedback to indicate disabled state
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      };
    }
    
    switch (rightActionType) {
      case 'scroll-to-top':
        return handleScrollToTop;
      case 'mark-all-read':
        return handleMarkAllRead;
      case 'edit-profile':
        return handleEditProfile;
      default:
        return () => {};
    }
  }, [rightActionType, isRightActionDisabled, handleScrollToTop, handleMarkAllRead, handleEditProfile]);
  
  // Get the appropriate icon for the right action
  const getRightActionIcon = useCallback((activeColor: string, inactiveColor: string) => {
    // Use inactive color when action is disabled
    const color = isRightActionDisabled ? inactiveColor : activeColor;
    
    switch (rightActionType) {
      case 'scroll-to-top':
        return <ArrowUp color={color} size={22} weight="fill" />;
      case 'mark-all-read':
        return <CheckCircle color={color} size={22} weight={hasUnreadNotifications ? 'fill' : 'regular'} />;
      case 'edit-profile':
        return <PencilSimple color={color} size={22} weight="fill" />;
      default:
        return null;
    }
  }, [rightActionType, isRightActionDisabled, hasUnreadNotifications]);
  
  // Get accessibility label for right action
  const getRightActionLabel = useCallback(() => {
    switch (rightActionType) {
      case 'scroll-to-top':
        return 'Scroll to top';
      case 'mark-all-read':
        return 'Mark all notifications as read';
      case 'edit-profile':
        return 'Edit profile';
      default:
        return '';
    }
  }, [rightActionType]);

  // ============================================================================
  // LAYOUT CALCULATION (Worklet - runs on UI thread)
  // Computes positions for three separate floating elements:
  // 1. Compose button (left drop) - DISAPPEARS on scroll
  // 2. Main tab bar (center reservoir) - EXPANDS to fill compose space
  // 3. Scroll-to-top button (right drop) - APPEARS on scroll
  // ============================================================================
  const layout = useDerivedValue(() => {
    const width = containerWidth.value || 0;
    const centerY = (CONTAINER_HEIGHT + insets.bottom * 0.3) / 2;
    
    // Progress values for fluid dynamics phases
    // Phase 1: Compose merges INTO bar (disappears) as user scrolls
    const rawMergeProgress = interpolate(scrollY.value, [DETACH_START, DETACH_END], [0, 1], Extrapolate.CLAMP);
    // Allow compose to reappear when scrolling back up without needing to reach top
    const mergeProgress = Math.max(0, Math.min(1, rawMergeProgress - composeReappearBoost.value * REAPPEAR_FACTOR));
    // Phase 2: Scroll-to-top buds FROM bar as user scrolls further
    const isProfileEdit = isProfileEditAction.value === 1;
    const rawBudProgress = interpolate(scrollY.value, [budStart.value, budEnd.value], [0, 1], Extrapolate.CLAMP);
    // For profile edit button: budStart = 0, so button should appear immediately at full size
    // Since budStart = 0 means the button should be visible from the start, show it at full size
    // This ensures the edit button is always visible and properly sized when authenticated
    const budProgress = isProfileEdit && rawBudProgress === 0
      ? 1.0 // Show button at full size for profile (since budStart = 0, it should be visible immediately)
      : rawBudProgress;
    
    // ========================================
    // COMPOSE BUTTON (Left Floating Drop)
    // Visible at rest, merges into bar as user scrolls
    // ========================================
    const composeLeft = horizontalPadding;
    const composeX = composeLeft + DROP_SIZE / 2;
    const composeVisible = mergeProgress < 1;
    
    // Compose space shrinks as it merges into bar (56 -> 0)
    const composeSpace = interpolate(mergeProgress, [0, 1], [DROP_SIZE + INITIAL_GAP, 0], Extrapolate.CLAMP);
    
    // ========================================
    // MAIN TAB BAR (Center Reservoir)
    // Centered between compose and right action button with equal gaps
    // ========================================
    // Right gap for scroll-to-top button (appears on scroll) - match left side spacing
    const rightGap = interpolate(budProgress, [0, 1], [0, INITIAL_GAP], Extrapolate.CLAMP);
    const upButtonVisible = budProgress > 0;
    
    // Space needed for right button
    const upButtonSpace = upButtonVisible ? DROP_SIZE + rightGap : 0;
    
    // Boundaries between compose (left) and right action
    const leftBoundary = horizontalPadding + composeSpace;
    const rightBoundary = width - horizontalPadding - upButtonSpace;
    const availableSpace = Math.max(rightBoundary - leftBoundary, 0);
    
    // Center the main bar within the available space
    const mainBarWidth = Math.max(availableSpace, 100);
    const mainBarLeft = leftBoundary + (availableSpace - mainBarWidth) / 2;
    const mainBarRight = mainBarLeft + mainBarWidth;
    
    // ========================================
    // SCROLL-TO-TOP BUTTON (Right Floating Drop)
    // Buds from the main bar as user scrolls down
    // ========================================
    const upButtonLeft = mainBarRight + rightGap;
    const upButtonX = upButtonLeft + DROP_SIZE / 2;
    
    // Bridge connection points (for liquid bridges)
    // Left bridge: compose right edge -> main bar left edge (only when compose visible)
    const leftBridgeStart = composeX + DROP_RADIUS;
    const leftBridgeEnd = mainBarLeft + BAR_CAP_RADIUS;
    const leftBridgeDistance = composeVisible ? Math.max(leftBridgeEnd - leftBridgeStart, 0) : STRETCH_LEFT + 1;
    
    // Right bridge: main bar right edge -> up button left edge
    const rightBridgeStart = mainBarRight - BAR_CAP_RADIUS;
    const rightBridgeEnd = upButtonX - DROP_RADIUS;
    const rightBridgeDistance = upButtonVisible ? Math.max(rightBridgeEnd - rightBridgeStart, 0) : 0;
    
    return {
      width,
      centerY,
      mergeProgress,
      budProgress,
      // Compose button
      composeX,
      composeLeft,
      composeVisible,
      composeSpace,
      // Main bar
      mainBarLeft,
      mainBarWidth,
      mainBarRight,
      // Up button
      upButtonX,
      upButtonLeft,
      upButtonVisible,
      // Bridge geometry
      leftBridgeStart,
      leftBridgeEnd,
      leftBridgeDistance,
      rightBridgeStart,
      rightBridgeEnd,
      rightBridgeDistance,
    };
  }, [insets.bottom, horizontalPadding]);

  // Keep pointer-events in sync with visibility so hidden drops don't steal taps
  useAnimatedReaction(
    () => {
      const l = layout.value;
      return l.composeVisible && l.mergeProgress < 0.95;
    },
    (visible) => {
      runOnJS(setComposePointerEvents)(visible ? 'auto' : 'none');
    },
    []
  );

  useAnimatedReaction(
    () => {
      const l = layout.value;
      // For profile edit button, ensure pointer events are enabled even if budProgress is exactly 1.0
      // The check should be >= 0.05 to catch the case where budProgress = 1.0
      return l.upButtonVisible && l.budProgress >= 0.05;
    },
    (enabled) => {
      runOnJS(setUpPointerEvents)(enabled ? 'auto' : 'none');
    },
    []
  );

  // Reset shared scroll state when switching tabs to avoid stale layout
  useEffect(() => {
    scrollY.value = 0;
  }, [state.index, scrollY]);

  // ============================================================================
  // LEFT BRIDGE: Compose Button ↔ Main Bar (Merge Physics)
  // Physics: Compose merges INTO the bar as user scrolls
  // Bridge shrinks, necks (Rayleigh-Plateau), and pinches off as compose disappears
  // ============================================================================
  const leftBridgeProps = useAnimatedProps(() => {
    const l = layout.value;
    
    // Early exit: No bridge if compose fully merged or no width
    if (
      !l.width ||
      !l.composeVisible ||
      l.mergeProgress <= MERGE_BRIDGE_MIN ||
      l.mergeProgress >= MERGE_BRIDGE_MAX ||
      l.leftBridgeDistance > STRETCH_LEFT ||
      l.leftBridgeDistance <= 0
    ) {
      return { d: '', fill: gooFill, fillOpacity: 0 };
    }
    
    // Compose button right edge (the "drop" being absorbed)
    const x1 = l.composeX;
    const y1 = l.centerY;
    const r1 = DROP_RADIUS;
    
    // Main bar left edge (the "reservoir" absorbing the drop)
    const x2 = l.mainBarLeft + BAR_CAP_RADIUS;
    const y2 = l.centerY;
    const r2 = BAR_CAP_RADIUS;
    
    // Generate physics-based liquid bridge path
    const bridgePath = getMetaballPath(x1, y1, r1, x2, y2, r2, STRETCH_LEFT);
    
    // Compute opacity: full at rest, fades as compose merges into bar
    const mergeWindow = Math.min(
      1,
      Math.max(0, (l.mergeProgress - MERGE_BRIDGE_MIN) / (MERGE_BRIDGE_MAX - MERGE_BRIDGE_MIN))
    );
    const bridgeOpacity = computeBridgeOpacity(l.leftBridgeDistance, STRETCH_LEFT, 'merge') * (1 - mergeWindow);
    
    return { 
      d: bridgePath, 
      fill: gooFill,
      fillOpacity: bridgeOpacity,
    };
  });

  // ============================================================================
  // RIGHT BRIDGE: Main Bar ↔ Scroll-to-Top Button (Budding Physics)
  // Physics: New "drop" buds from the main bar as user scrolls down
  // Bridge forms, stretches with surface tension, then pinches off
  // ============================================================================
  const rightBridgeProps = useAnimatedProps(() => {
    const l = layout.value;
    
    // Early exit: No bridge if button not visible or fully detached
    if (
      !l.width ||
      !l.upButtonVisible ||
      l.budProgress <= BUD_BRIDGE_MIN ||
      l.budProgress >= BUD_BRIDGE_MAX ||
      l.rightBridgeDistance > STRETCH_RIGHT
    ) {
      return { d: '', fill: gooFill, fillOpacity: 0 };
    }
    
    // Main bar right edge (the "reservoir" from which the drop buds)
    const x1 = l.mainBarRight - BAR_CAP_RADIUS;
    const y1 = l.centerY;
    const r1 = BAR_CAP_RADIUS;
    
    // Scroll-to-top button center (the budding "drop")
    const x2 = l.upButtonX;
    const y2 = l.centerY;
    const r2 = DROP_RADIUS;
    
    // Generate physics-based liquid bridge path
    const bridgePath = getMetaballPath(x1, y1, r1, x2, y2, r2, STRETCH_RIGHT);
    
    // Compute opacity for budding phase
    const budWindow = Math.min(
      1,
      Math.max(0, (BUD_BRIDGE_MAX - l.budProgress) / (BUD_BRIDGE_MAX - BUD_BRIDGE_MIN))
    );
    const bridgeOpacity = computeBridgeOpacity(l.rightBridgeDistance, STRETCH_RIGHT, 'bud') * budWindow;
    
    return { 
      d: bridgePath, 
      fill: gooFill,
      fillOpacity: bridgeOpacity,
    };
  });

  // ============================================================================
  // ANIMATED STYLES FOR FLOATING ELEMENTS
  // ============================================================================
  
  // Compose button: Visible at rest, shrinks and fades as it merges into bar
  const composeDropStyle = useAnimatedStyle(() => {
    const l = layout.value;
    
    // Scale shrinks as compose merges (1 -> 0)
    const scale = interpolate(l.mergeProgress, [0, 0.7, 1], [1, 0.6, 0], Extrapolate.CLAMP);
    // Opacity fades as compose merges
    const opacity = interpolate(l.mergeProgress, [0, 0.8, 1], [1, 0.4, 0], Extrapolate.CLAMP);
    
    return {
      left: l.composeLeft,
      opacity: withSpring(opacity, { damping: 14, stiffness: 220 }),
      transform: [{ 
        scale: withSpring(scale, { damping: 14, stiffness: 220 }) 
      }]
    };
  });

  // Main tab bar: Expands left as compose disappears, contracts right as up button appears
  const mainBarStyle = useAnimatedStyle(() => {
    const l = layout.value;
    return {
      left: withSpring(l.mainBarLeft, { damping: 18, stiffness: 180 }),
      width: withSpring(l.mainBarWidth, { damping: 18, stiffness: 180 }),
    };
  });

  // Indicator within the main bar
  const indicatorStyle = useAnimatedStyle(() => {
    const l = layout.value;
    const routeCount = visibleRoutes.length || 1;
    
    if (indicatorIndex.value < 0 || !l.mainBarWidth) {
      return { opacity: 0 };
    }
    
    const slotWidth = l.mainBarWidth / routeCount;
    const translateX = slotWidth * (indicatorIndex.value + 0.5) - INDICATOR_WIDTH / 2;
    
    return {
      opacity: 1,
      transform: [{ translateX: withSpring(translateX, { damping: 16, stiffness: 220 }) }],
    };
  });

  // Scroll-to-top button: Appears and scales in as user scrolls
  const upDropStyle = useAnimatedStyle(() => {
    const l = layout.value;
    const scale = interpolate(l.budProgress, [0, 0.3, 1], [0, 0.8, 1], Extrapolate.CLAMP);
    const opacity = interpolate(l.budProgress, [0, 0.2], [0, 1], Extrapolate.CLAMP);
    
    return {
      left: l.upButtonLeft,
      opacity: withSpring(opacity, { damping: 14, stiffness: 220 }),
      transform: [{ 
        scale: withSpring(scale, { damping: 14, stiffness: 220 }) 
      }],
    };
  });

  return (
    <View
      style={[
        styles.floatingContainer,
        {
          left: 0,
          right: 0,
          bottom: 10 + insets.bottom * 0.35,
          paddingHorizontal: horizontalPadding,
          height: CONTAINER_HEIGHT + insets.bottom * 0.35,
        },
      ]}
      pointerEvents="box-none"
      onLayout={(e) => {
        containerWidth.value = e.nativeEvent.layout.width;
      }}
    >
      {/* ================================================================
          FLUID BRIDGES (SVG Layer)
          Connects the floating elements with physics-based liquid bridges
          ================================================================ */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg height="100%" width="100%">
          <AnimatedPath animatedProps={leftBridgeProps} />
          <AnimatedPath animatedProps={rightBridgeProps} />
        </Svg>
      </View>

      {/* ================================================================
          COMPOSE BUTTON (Left Floating Drop)
          Separate floating element that detaches from main bar on scroll
          ================================================================ */}
      <Animated.View
        style={[
          styles.composeDrop,
          { 
            backgroundColor: surfaceBg,
            borderColor: isAmoled ? colors.border : isDark ? 'transparent' : colors.border,
            borderWidth: isAmoled ? 0.5 : isDark ? 0 : 0.5,
            shadowColor: colors.shadow,
          },
          composeDropStyle,
        ]}
        pointerEvents={composePointerEvents}
      >
        <BlurView
          intensity={tokens.blur.tabBar}
          tint={isAmoled || isDark ? 'dark' : 'light'}
          style={styles.dropBlur}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create Byte"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              navigation.navigate('compose');
            }}
            style={styles.fullHitbox}
            hitSlop={TAB_HIT_SLOP}
          >
            <Plus color={colors.active} size={TAB_ITEM_ICON_SIZE} weight="fill" />
          </Pressable>
        </BlurView>
      </Animated.View>

      {/* ================================================================
          MAIN TAB BAR (Center Reservoir)
          The primary navigation bar containing tab icons
          ================================================================ */}
      <Animated.View
        style={[
          styles.mainBar,
          { 
            backgroundColor: surfaceBg,
            shadowColor: colors.shadow,
          },
          mainBarStyle,
        ]}
      >
        <BlurView
          intensity={tokens.blur.tabBar}
          tint={isAmoled || isDark ? 'dark' : 'light'}
          style={styles.mainBarBlur}
        >
          <View
            style={[
              styles.tabRow,
              { paddingBottom: insets.bottom * 0.3, height: 56 + insets.bottom * 0.3 },
            ]}
          >
            {/* Active tab indicator */}
            <Animated.View
              style={[
                styles.indicator,
                { backgroundColor: colors.active },
                indicatorStyle,
              ]}
            />

            {/* Tab icons with fluid animations */}
            {visibleRoutes.map((route: any) => {
              const activeKey = state.routes[state.index]?.key;
              const isFocused = activeKey === route.key;
              const { options } = descriptors[route.key];
              const renderIcon = options.tabBarIcon;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                Haptics.selectionAsync().catch(() => {});

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <FluidTabItem
                  key={route.key}
                  routeName={route.name}
                  routeKey={route.key}
                  isFocused={isFocused}
                  activeColor={colors.active}
                  inactiveColor={colors.inactive}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  onPress={onPress}
                  renderIcon={renderIcon}
                  showBadge={
                    (route.name === 'notifications' && unreadCount > 0) ||
                    (route.name === 'profile' && showDraftBadge)
                  }
                  badgeCount={route.name === 'notifications' ? unreadCount : draftCount}
                  badgeBg={colors.badgeBg}
                  badgeText={colors.badgeText}
                  isDark={isDark}
                />
              );
            })}
          </View>
        </BlurView>
      </Animated.View>

      {/* ================================================================
          RIGHT ACTION BUTTON (Context-Aware Floating Drop)
          - Feed/Search: Scroll-to-top
          - Notifications: Mark all read
          - Profile (own): Edit profile
          Buds from the main bar as user scrolls down
          ================================================================ */}
      {rightActionType !== 'none' && (
        <Animated.View
          style={[
            styles.upDrop,
            { 
              backgroundColor: surfaceBg,
            borderColor: isAmoled ? colors.border : isDark ? 'transparent' : colors.border,
            borderWidth: isAmoled ? 0.5 : isDark ? 0 : 0.5,
              shadowColor: colors.shadow,
            },
            upDropStyle,
          ]}
          pointerEvents={upPointerEvents}
        >
          <BlurView
            intensity={tokens.blur.tabBar}
            tint={isAmoled || isDark ? 'dark' : 'light'}
            style={styles.dropBlur}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={getRightActionLabel()}
              accessibilityState={{ disabled: isRightActionDisabled }}
              onPress={getRightActionHandler()}
              style={[
                styles.fullHitbox,
                isRightActionDisabled && { opacity: 0.5 }
              ]}
              hitSlop={TAB_HIT_SLOP}
            >
              {getRightActionIcon(colors.active, colors.inactive)}
            </Pressable>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}

export default function TabLayout(): React.ReactElement {
  const { notifications, markAllAsRead } = useNotifications();
  const { preferences } = useNotificationPreferences();
  const { isAuthenticated } = useAuth();
  const { settings } = useSettingsStorage();
  const [draftCount, setDraftCount] = useState(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Filter notifications by preferences, then count unread
  const preferenceFiltered = useMemo(
    () => filterNotificationsByPreferences(notifications, preferences),
    [notifications, preferences]
  );

  const unreadCount = useMemo(
    () => preferenceFiltered.filter(n => !n.isRead).length,
    [preferenceFiltered]
  );

  const refreshDraftCount = useCallback(async () => {
    if (!isAuthenticated) {
      setDraftCount(0);
      return;
    }
    try {
      const response = await discourseApi.getUserDrafts();
      if (response.success && response.data?.drafts) {
        setDraftCount(response.data.drafts.length);
      }
    } catch {
      // Best effort; ignore errors
    }
  }, [isAuthenticated]);

  // Initial fetch on mount
  useEffect(() => {
    refreshDraftCount();
  }, [refreshDraftCount]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      refreshDraftCount();
    }, [refreshDraftCount])
  );

  // Refresh when app comes to foreground (throttled via AppState)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        refreshDraftCount();
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [refreshDraftCount]);

  // Only show draft badge when auto-save is enabled (or if drafts exist from manual saves)
  // When auto-save is off, users explicitly save, so we still show the badge to indicate saved drafts
  const showDraftBadge = draftCount > 0;
  
  // Check if there are any unread notifications (for "Mark all read" button state)
  const hasUnreadNotifications = unreadCount > 0;

  // Icon sizes imported from tabBarConstants.ts

  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = useMemo(() => {
    return {
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarShowLabel: false,
    };
  }, []);

  return (
    <FluidNavProvider>
      <Tabs
        screenOptions={screenOptions}
        tabBar={(props) => (
          <CustomTabBar
            {...props}
          unreadCount={unreadCount}
          markAllAsRead={markAllAsRead}
          hasUnreadNotifications={hasUnreadNotifications}
          isAuthenticated={isAuthenticated}
          draftCount={draftCount}
          showDraftBadge={showDraftBadge}
        />
      )}
    >
        <Tabs.Screen
          name="index"
          options={{
            tabBarItemStyle: styles.tabBarItem,
            tabBarIcon: ({ color, focused }) => (
              <House
                color={color}
                size={ICON_SIZE}
                weight={focused ? 'fill' : 'regular'}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            tabBarItemStyle: styles.tabBarItem,
            tabBarIcon: ({ color, focused }) => (
              <MagnifyingGlass
                color={color}
                size={ICON_SIZE}
                weight={focused ? 'fill' : 'regular'}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="compose"
          options={{
            tabBarItemStyle: styles.composeSlot,
            tabBarIcon: () => (
              <Plus color="#ffffff" size={COMPOSE_ICON_SIZE} weight="bold" />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            tabBarItemStyle: styles.tabBarItem,
            tabBarIcon: ({ color, focused }) => (
              <Bell
                color={color}
                size={ICON_SIZE}
                weight={focused ? 'fill' : 'regular'}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarItemStyle: styles.tabBarItem,
            tabBarIcon: ({ color, focused }) => (
              <User
                color={color}
                size={ICON_SIZE}
                weight={focused ? 'fill' : 'regular'}
              />
            ),
          }}
        />
      </Tabs>
    </FluidNavProvider>
  );
}

const styles = StyleSheet.create({
  // ============================================================================
  // TAB BAR ITEM STYLES (for Expo Router)
  // ============================================================================
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  composeSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },

  // ============================================================================
  // FLOATING CONTAINER (Root container for all floating elements)
  // ============================================================================
  floatingContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
  },

  // ============================================================================
  // COMPOSE BUTTON (Left Floating Drop)
  // ============================================================================
  composeDrop: {
    position: 'absolute',
    width: DROP_SIZE,
    height: DROP_SIZE,
    borderRadius: DROP_RADIUS,
    overflow: 'hidden',
    top: 12,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 3,
  },
  dropBlur: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: DROP_RADIUS,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ============================================================================
  // MAIN TAB BAR (Center Reservoir)
  // ============================================================================
  mainBar: {
    position: 'absolute',
    height: DROP_SIZE,
    borderRadius: DROP_RADIUS,
    overflow: 'hidden',
    top: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 2,
  },
  mainBarBlur: {
    flex: 1,
    borderRadius: DROP_RADIUS,
    overflow: 'hidden',
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    bottom: 10,
    width: INDICATOR_WIDTH,
    height: 4,
    borderRadius: 2,
    opacity: 0.8,
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  // ============================================================================
  // SCROLL-TO-TOP BUTTON (Right Floating Drop)
  // ============================================================================
  upDrop: {
    position: 'absolute',
    width: DROP_SIZE,
    height: DROP_SIZE,
    borderRadius: DROP_RADIUS,
    overflow: 'hidden',
    top: 12,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 3,
  },

  // ============================================================================
  // SHARED STYLES
  // ============================================================================
  fullHitbox: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: BADGE_TOP,
    right: BADGE_RIGHT,
    minWidth: BADGE_MIN_WIDTH,
    height: BADGE_HEIGHT,
    borderRadius: BADGE_BORDER_RADIUS,
    paddingHorizontal: BADGE_PADDING_HORIZONTAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: BADGE_FONT_SIZE,
    fontWeight: BADGE_FONT_WEIGHT,
    lineHeight: BADGE_LINE_HEIGHT,
  },
});
