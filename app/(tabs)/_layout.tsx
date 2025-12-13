import React, { useEffect, useMemo, useCallback } from 'react';
import { Tabs, router } from 'expo-router';
import { House, MagnifyingGlass, Plus, Bell, User, ArrowUp, CheckCircle, PencilSimple } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/theme';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { useNotifications } from '../../shared/useNotifications';
import { useNotificationPreferences } from '../../shared/useNotificationPreferences';
import { filterNotificationsByPreferences } from '../../lib/utils/notifications';
import { useAuth } from '@/shared/auth-context';
import * as Haptics from 'expo-haptics';
import { getThemeColors } from '@/shared/theme-constants';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useDerivedValue, useAnimatedStyle, withSpring, useAnimatedProps, interpolate, Extrapolate } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { FluidNavProvider, useFluidNav } from '@/shared/navigation/fluidNavContext';

// ============================================================================
// SCREEN TYPES FOR CONTEXT-AWARE NAVIGATION
// ============================================================================
type ScreenType = 'feed' | 'search' | 'notifications' | 'profile';
type RightActionType = 'scroll-to-top' | 'mark-all-read' | 'edit-profile' | 'none';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ============================================================================
// FLUID DYNAMICS ENGINE (Worklet-safe)
// Implements physics-based liquid bridge using:
// - Young-Laplace: Δp = γκ (pressure jump via curvature)
// - Rayleigh-Plateau instability: λ > 2πr causes necking & pinch-off
// - Capillary coalescence: Bridge growth via surface tension
// ============================================================================

/**
 * Computes dynamic neck radius based on Rayleigh-Plateau instability
 * r_min ~ (μ²/ργ)^(1/3) * (t_p - t)^(2/3) (self-similar scaling)
 * Simplified: As distance increases, neck radius decreases non-linearly
 */
function computeNeckRadius(
  baseRadius: number,
  distance: number,
  maxStretch: number
): number {
  'worklet';
  // Normalized stretch ratio (0 = touching, 1 = max stretch)
  const stretchRatio = Math.min(distance / maxStretch, 1);
  
  // Non-linear necking: r_neck = r_base * (1 - stretchRatio)^(2/3)
  // This mimics the self-similar pinch-off behavior
  const neckFactor = Math.pow(1 - stretchRatio, 0.667);
  
  // Minimum neck radius before complete pinch-off (prevents visual artifacts)
  const minNeck = baseRadius * 0.08;
  return Math.max(baseRadius * neckFactor, minNeck);
}

/**
 * Computes curvature-based spread for Bezier control points
 * Based on Young-Laplace: κ = Δp/γ where higher curvature = tighter neck
 * Surface tension tries to minimize surface area, creating the "hourglass" shape
 */
function computeCurvatureSpread(
  distance: number,
  maxStretch: number,
  neckRadius: number,
  baseRadius: number
): number {
  'worklet';
  // As bridge stretches, curvature increases (inversely proportional to neck radius)
  // High curvature = inward pull = smaller spread
  const curvature = baseRadius / Math.max(neckRadius, 0.1);
  
  // Spread factor: starts wide (0.5), narrows with stretch and curvature
  // This creates the characteristic hourglass meniscus shape
  const baseSpread = 0.5;
  const stretchPenalty = interpolate(
    distance,
    [0, maxStretch * 0.5, maxStretch],
    [0, 0.2, 0.4],
    Extrapolate.CLAMP
  );
  
  // Surface tension effect: higher curvature pulls inward
  const curvatureEffect = Math.min(curvature * 0.05, 0.25);
  
  return Math.max(baseSpread - stretchPenalty - curvatureEffect, 0.05);
}

/**
 * Metaball-style liquid bridge with physics-based necking
 * Simulates capillary coalescence (merging) and Rayleigh-Plateau pinch-off (detaching)
 * 
 * @param x1, y1, r1 - First circle (anchor point)
 * @param x2, y2, r2 - Second circle (moving point)
 * @param stretchLimit - Max distance before bridge ruptures (pinch-off)
 * @returns SVG path string for the liquid bridge
 */
function getMetaballPath(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
  stretchLimit: number
): string {
  'worklet';
  
  // Calculate Euclidean distance between centers
  const distance = Math.hypot(x2 - x1, y2 - y1);
  
  // Rayleigh-Plateau instability: Bridge ruptures when stretched too far
  // λ > 2πr perturbations grow exponentially, causing pinch-off
  if (distance === 0 || distance > stretchLimit) {
    return '';
  }
  
  // Compute dynamic neck radii based on non-linear scaling
  const effectiveR1 = computeNeckRadius(r1, distance, stretchLimit);
  const effectiveR2 = computeNeckRadius(r2, distance, stretchLimit);
  
  // Direction angle from circle 1 to circle 2
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const perpAnglePos = angle + Math.PI / 2;
  const perpAngleNeg = angle - Math.PI / 2;
  
  // Tangent points on first circle (with dynamic radius for necking)
  const p1x = x1 + effectiveR1 * Math.cos(perpAnglePos);
  const p1y = y1 + effectiveR1 * Math.sin(perpAnglePos);
  const p2x = x1 + effectiveR1 * Math.cos(perpAngleNeg);
  const p2y = y1 + effectiveR1 * Math.sin(perpAngleNeg);
  
  // Tangent points on second circle
  const p3x = x2 + effectiveR2 * Math.cos(perpAnglePos);
  const p3y = y2 + effectiveR2 * Math.sin(perpAnglePos);
  const p4x = x2 + effectiveR2 * Math.cos(perpAngleNeg);
  const p4y = y2 + effectiveR2 * Math.sin(perpAngleNeg);
  
  // Compute curvature-based spread for the meniscus
  const avgRadius = (r1 + r2) / 2;
  const spread = computeCurvatureSpread(distance, stretchLimit, (effectiveR1 + effectiveR2) / 2, avgRadius);
  
  // Midpoint for control point calculation (center of liquid bridge)
  const mx = x1 + (x2 - x1) * 0.5;
  const my = y1 + (y2 - y1) * 0.5;
  
  // Neck midpoint: The narrowest part of the bridge
  // Compute neck radius at midpoint for the hourglass effect
  const midNeckRadius = computeNeckRadius(avgRadius, distance, stretchLimit) * 0.6;
  
  // Control points create the inward curve (surface tension minimizing area)
  // Perpendicular offset creates the characteristic liquid bridge shape
  const perpDx = (y2 - y1);
  const perpDy = (x1 - x2);
  const perpLen = Math.hypot(perpDx, perpDy);
  const normPerpDx = perpLen > 0 ? perpDx / perpLen : 0;
  const normPerpDy = perpLen > 0 ? perpDy / perpLen : 0;
  
  // Neck inset based on surface tension (Young-Laplace curvature effect)
  const neckInset = (avgRadius - midNeckRadius) * (1 + spread);
  
  // Control points for cubic Bezier curves (creating smooth meniscus)
  const ctrl1x = mx + normPerpDx * neckInset;
  const ctrl1y = my + normPerpDy * neckInset;
  const ctrl2x = mx - normPerpDx * neckInset;
  const ctrl2y = my - normPerpDy * neckInset;
  
  // Additional control points for smoother cubic curves
  const t = 0.33; // Position along the bridge for intermediate controls
  const mid1x = x1 + (x2 - x1) * t;
  const mid1y = y1 + (y2 - y1) * t;
  const mid2x = x1 + (x2 - x1) * (1 - t);
  const mid2y = y1 + (y2 - y1) * (1 - t);
  
  // Build the liquid bridge path using cubic Bezier curves
  // This creates a smooth, physically-plausible meniscus shape
  return `
    M ${p1x} ${p1y}
    C ${mid1x + normPerpDx * neckInset * 0.7} ${mid1y + normPerpDy * neckInset * 0.7}
      ${ctrl1x} ${ctrl1y}
      ${mx + normPerpDx * midNeckRadius} ${my + normPerpDy * midNeckRadius}
    C ${ctrl1x} ${ctrl1y}
      ${mid2x + normPerpDx * neckInset * 0.7} ${mid2y + normPerpDy * neckInset * 0.7}
      ${p3x} ${p3y}
    L ${p4x} ${p4y}
    C ${mid2x - normPerpDx * neckInset * 0.7} ${mid2y - normPerpDy * neckInset * 0.7}
      ${ctrl2x} ${ctrl2y}
      ${mx - normPerpDx * midNeckRadius} ${my - normPerpDy * midNeckRadius}
    C ${ctrl2x} ${ctrl2y}
      ${mid1x - normPerpDx * neckInset * 0.7} ${mid1y - normPerpDy * neckInset * 0.7}
      ${p2x} ${p2y}
    Z
  `;
}

/**
 * Computes bridge opacity based on Rayleigh-Plateau necking phase
 * Opacity decreases as the bridge approaches critical pinch-off
 */
function computeBridgeOpacity(
  distance: number,
  stretchLimit: number,
  phase: 'merge' | 'bud'
): number {
  'worklet';
  
  if (phase === 'merge') {
    // Merging: Opacity is full when close, fades as bridge stretches
    // Represents the bridge becoming thinner and more transparent
    return interpolate(
      distance,
      [0, stretchLimit * 0.6, stretchLimit * 0.85, stretchLimit],
      [1, 0.85, 0.4, 0],
      Extrapolate.CLAMP
    );
  } else {
    // Budding: Bridge appears as drop separates, then fades at pinch-off
    return interpolate(
      distance,
      [0, stretchLimit * 0.2, stretchLimit * 0.6, stretchLimit],
      [0, 0.6, 0.9, 0],
      Extrapolate.CLAMP
    );
  }
}

// Hook to centralize tab bar color logic using theme tokens
function useTabBarColors(isDark: boolean, isAmoled: boolean) {
  return useMemo(() => {
    const colors = getThemeColors(isDark ? 'dark' : 'light', isAmoled);
    
    return {
      bg: isAmoled ? colors.background : colors.card,
      border: colors.border,
      active: colors.accent,
      inactive: colors.mutedForeground,
      shadow: isAmoled 
        ? 'rgba(96, 165, 250, 0.1)' // Subtle blue glow for AMOLED
        : isDark 
        ? 'rgba(0, 0, 0, 0.3)' 
        : 'rgba(0, 0, 0, 0.08)',
      fab: colors.accent,
      fabGradient: colors.ring,
      badgeBg: colors.destructive,
      badgeText: colors.destructiveForeground,
    };
  }, [isDark, isAmoled]);
}

// Memoized tab button with haptics and press feedback
function TabIcon({ isFocused, children }: { isFocused: boolean; children: React.ReactNode }) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isFocused ? 1.12 : 1, { damping: 16, stiffness: 210 }) }],
    opacity: withSpring(isFocused ? 1 : 0.65, { damping: 18, stiffness: 180 }),
  }), [isFocused]);

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function CustomTabBar({
  state,
  descriptors,
  navigation,
  unreadCount,
  markAllAsRead,
  hasUnreadNotifications,
  isAuthenticated,
}: any) {
  // ============================================================================
  // PHYSICAL LAYOUT CONSTANTS
  // These define the geometry of our fluid navigation system
  // ============================================================================
  const INDICATOR_WIDTH = 34;
  const DROP_RADIUS = 28;        // Radius of floating button "drops"
  const BAR_CAP_RADIUS = 22;     // Radius of main bar end caps
  const DROP_SIZE = 56;          // Full diameter of floating buttons
  const INITIAL_GAP = 8;         // Physical gap between elements at rest
  const STRETCH_LEFT = 80;       // Max stretch before left bridge pinch-off
  const STRETCH_RIGHT = 80;      // Max stretch before right bridge pinch-off
  const PADDING = 16;
  const CONTAINER_HEIGHT = 86;
  
  // Scroll thresholds for distinct phases (fluid dynamics)
  // Phase 1: Compose detaches from bar (reverse merge)
  const DETACH_START = 0;
  const DETACH_END = 100;
  // Phase 2: Scroll-to-top buds from bar
  const BUD_START = 120;
  const BUD_END = 220;
  const insets = useSafeAreaInsets();
  const { isDark, isAmoled } = useTheme();
  const { scrollY, triggerUp } = useFluidNav();
  const colors = useTabBarColors(isDark, isAmoled);
  const surfaceBg = isDark ? 'rgba(17,24,39,0.35)' : 'rgba(255,255,255,0.55)';
  const gooFill = surfaceBg;

  const containerWidth = useSharedValue(0);
  const indicatorIndex = useSharedValue(0);
  const homeRoute = useMemo(
    () => state.routes.find((r: any) => r.name === 'index'),
    [state.routes]
  );

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

  // ============================================================================
  // RIGHT ACTION HANDLERS
  // Context-aware handlers for the right floating button
  // ============================================================================
  
  // Scroll to top handler (feed/search)
  const handleScrollToTop = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    triggerUp(); // Calls the handler registered by the currently active screen
  }, [triggerUp]);
  
  // Mark all notifications as read handler (notifications)
  const handleMarkAllRead = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (hasUnreadNotifications && markAllAsRead) {
      markAllAsRead();
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
    const mergeProgress = interpolate(scrollY.value, [DETACH_START, DETACH_END], [0, 1], Extrapolate.CLAMP);
    // Phase 2: Scroll-to-top buds FROM bar as user scrolls further
    const budProgress = interpolate(scrollY.value, [BUD_START, BUD_END], [0, 1], Extrapolate.CLAMP);
    
    // ========================================
    // COMPOSE BUTTON (Left Floating Drop)
    // Visible at rest, merges into bar as user scrolls
    // ========================================
    const composeLeft = PADDING;
    const composeX = composeLeft + DROP_SIZE / 2;
    const composeVisible = mergeProgress < 1;
    
    // Compose space shrinks as it merges into bar (56 -> 0)
    const composeSpace = interpolate(mergeProgress, [0, 1], [DROP_SIZE + INITIAL_GAP, 0], Extrapolate.CLAMP);
    
    // ========================================
    // MAIN TAB BAR (Center Reservoir)
    // Expands LEFT as compose disappears, contracts RIGHT as up button appears
    // ========================================
    // Main bar starts after compose space (which shrinks to 0)
    const mainBarLeft = PADDING + composeSpace;
    
    // Right gap for scroll-to-top button (appears on scroll)
    const rightGap = interpolate(budProgress, [0, 1], [0, INITIAL_GAP + STRETCH_RIGHT * 0.5], Extrapolate.CLAMP);
    const upButtonVisible = budProgress > 0;
    
    // Main bar expands left as compose merges, contracts right as up button buds
    const upButtonSpace = upButtonVisible ? DROP_SIZE + rightGap : 0;
    const mainBarWidth = Math.max(width - PADDING * 2 - composeSpace - upButtonSpace, 100);
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
  }, [insets.bottom]);

  // ============================================================================
  // LEFT BRIDGE: Compose Button ↔ Main Bar (Merge Physics)
  // Physics: Compose merges INTO the bar as user scrolls
  // Bridge shrinks, necks (Rayleigh-Plateau), and pinches off as compose disappears
  // ============================================================================
  const leftBridgeProps = useAnimatedProps(() => {
    const l = layout.value;
    
    // Early exit: No bridge if compose fully merged or no width
    if (!l.width || !l.composeVisible || l.leftBridgeDistance > STRETCH_LEFT || l.leftBridgeDistance <= 0) {
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
    const bridgeOpacity = computeBridgeOpacity(l.leftBridgeDistance, STRETCH_LEFT, 'merge');
    
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
    if (!l.width || !l.upButtonVisible || l.rightBridgeDistance > STRETCH_RIGHT) {
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
    const bridgeOpacity = computeBridgeOpacity(l.rightBridgeDistance, STRETCH_RIGHT, 'bud');
    
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
      }],
      // Hide completely when fully merged
      pointerEvents: l.composeVisible ? 'auto' : 'none',
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
          paddingHorizontal: Math.max(insets.left, insets.right, 8),
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
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
          composeDropStyle,
        ]}
      >
        <BlurView
          intensity={isAmoled ? 36 : isDark ? 48 : 64}
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
            hitSlop={12}
          >
            <Plus color={colors.active} size={28} weight="fill" />
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
          intensity={isAmoled ? 36 : isDark ? 48 : 64}
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

            {/* Tab icons */}
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

              const color = isFocused ? colors.active : colors.inactive;

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  accessibilityState={isFocused ? { selected: true } : {}}
                  onPress={onPress}
                  style={styles.tabPressable}
                  hitSlop={12}
                >
                  <TabIcon isFocused={isFocused}>
                    {renderIcon?.({
                      focused: isFocused,
                      color,
                      size: 26,
                    })}
                  </TabIcon>
                  {route.name === 'notifications' && unreadCount > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
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
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
            upDropStyle,
          ]}
        >
          <BlurView
            intensity={isAmoled ? 36 : isDark ? 48 : 64}
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
              hitSlop={12}
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

  // Filter notifications by preferences, then count unread
  const preferenceFiltered = useMemo(
    () => filterNotificationsByPreferences(notifications, preferences),
    [notifications, preferences]
  );

  const unreadCount = useMemo(
    () => preferenceFiltered.filter(n => !n.isRead).length,
    [preferenceFiltered]
  );
  
  // Check if there are any unread notifications (for "Mark all read" button state)
  const hasUnreadNotifications = unreadCount > 0;

  // Icon size constant - no more size + 2
  const ICON_SIZE = 28;
  const COMPOSE_ICON_SIZE = 28;

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
    width: 56,
    height: 56,
    borderRadius: 28,
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
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ============================================================================
  // MAIN TAB BAR (Center Reservoir)
  // ============================================================================
  mainBar: {
    position: 'absolute',
    height: 56,
    borderRadius: 28,
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
    borderRadius: 28,
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
    width: 34,
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
    width: 56,
    height: 56,
    borderRadius: 28,
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
    top: 4,
    right: 12,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
});
