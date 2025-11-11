import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  ViewStyle, 
  Animated,
  Easing,
  Dimensions,
  DimensionValue,
} from 'react-native';
import { useTheme } from '@/components/theme';
import { ButtonEnhanced } from '../ui/button.enhanced';
import { 
  typography, 
  spacing, 
  borderRadius, 
  animation, 
  getThemeColors,
  createTextStyle,
  createShadowStyle,
} from '@/shared/design-system';

const { width: screenWidth } = Dimensions.get('window');

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

/**
 * Enhanced Loading Spinner with smooth animations
 */
export function LoadingSpinnerEnhanced({ 
  size = 'large', 
  color, 
  style 
}: LoadingSpinnerProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const spinnerColor = color || colors.primary;

  return (
    <View style={[styles.spinnerContainer, style]}>
      <ActivityIndicator size={size} color={spinnerColor} />
    </View>
  );
}

interface LoadingOverlayProps {
  message?: string;
  visible: boolean;
  style?: ViewStyle;
  onCancel?: () => void;
  cancelText?: string;
}

/**
 * Enhanced Full Screen Loading Overlay with fade animation
 */
export function LoadingOverlayEnhanced({ 
  message = 'Loading...', 
  visible, 
  style,
  onCancel,
  cancelText = 'Cancel',
}: LoadingOverlayProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: animation.duration.normal,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: animation.duration.fast,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.overlay, 
        { 
          backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)',
          opacity: fadeAnim,
        }, 
        style
      ]}
    >
      <View style={[
        styles.overlayContent, 
        { 
          backgroundColor: colors.surface,
          ...createShadowStyle('xl', isDark),
        }
      ]}>
        <ActivityIndicator 
          size="large" 
          color={colors.primary} 
          style={styles.overlaySpinner} 
        />
        <Text style={[
          createTextStyle('body', colors.text),
          styles.overlayText,
        ]}>
          {message}
        </Text>
        {onCancel && (
          <ButtonEnhanced
            variant="ghost"
            size="sm"
            onPress={onCancel}
            style={styles.cancelButton}
          >
            {cancelText}
          </ButtonEnhanced>
        )}
      </View>
    </Animated.View>
  );
}

interface LoadingStateProps {
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  onRetry?: () => void;
  retryText?: string;
}

/**
 * Enhanced Loading State Handler with smooth transitions
 */
export function LoadingStateEnhanced({
  loading,
  error,
  children,
  loadingComponent,
  errorComponent,
  onRetry,
  retryText = 'Try Again',
}: LoadingStateProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: loading || error ? 0.7 : 1,
      duration: animation.duration.normal,
      useNativeDriver: true,
    }).start();
  }, [loading, error, fadeAnim]);

  if (loading) {
    return (
      <>
        {loadingComponent || (
          <View style={styles.stateContainer}>
            <LoadingSpinnerEnhanced />
            <Text style={[
              createTextStyle('body', colors.textSecondary),
              styles.stateText,
            ]}>
              Loading...
            </Text>
          </View>
        )}
      </>
    );
  }

  if (error) {
    return (
      <>
        {errorComponent || (
          <View style={styles.stateContainer}>
            <Text style={[
              createTextStyle('title', colors.error),
              styles.errorTitle,
            ]}>
              Something went wrong
            </Text>
            <Text style={[
              createTextStyle('body', colors.textSecondary),
              styles.errorMessage,
            ]}>
              {error}
            </Text>
            {onRetry && (
              <ButtonEnhanced
                variant="outline"
                size="md"
                onPress={onRetry}
                style={styles.retryButton}
              >
                {retryText}
              </ButtonEnhanced>
            )}
          </View>
        )}
      </>
    );
  }

  return (
    <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
      {children}
    </Animated.View>
  );
}

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  animated?: boolean;
}

/**
 * Enhanced Skeleton with shimmer animation
 */
export function SkeletonEnhanced({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4, 
  style,
  animated = true,
}: SkeletonProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      
      shimmerAnimation.start();
      
      return () => shimmerAnimation.stop();
    }
  }, [animated, shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? colors.surfaceVariant : colors.border,
        },
        style,
      ]}
    >
      {animated && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.surface,
              opacity: shimmerOpacity,
              borderRadius,
            },
          ]}
        />
      )}
    </View>
  );
}

/**
 * Enhanced User Skeleton with proper spacing
 */
export function UserSkeletonEnhanced() {
  return (
    <View style={styles.userSkeleton}>
      <SkeletonEnhanced 
        width={40} 
        height={40} 
        borderRadius={20} 
        style={styles.userSkeletonAvatar} 
      />
      <View style={styles.userSkeletonContent}>
        <SkeletonEnhanced 
          width="60%" 
          height={16} 
          style={styles.userSkeletonName} 
        />
        <SkeletonEnhanced width="40%" height={14} />
      </View>
    </View>
  );
}

/**
 * Enhanced Post Skeleton with proper layout
 */
export function PostSkeletonEnhanced() {
  return (
    <View style={styles.postSkeleton}>
      <UserSkeletonEnhanced />
      <SkeletonEnhanced 
        width="100%" 
        height={60} 
        style={styles.postSkeletonContent} 
      />
      <View style={styles.postSkeletonActions}>
        <SkeletonEnhanced width={60} height={16} />
        <SkeletonEnhanced width={60} height={16} />
        <SkeletonEnhanced width={60} height={16} />
      </View>
    </View>
  );
}

/**
 * Pull to Refresh Loading Indicator
 */
export function PullToRefreshIndicator() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    rotateAnimation.start();
    
    return () => rotateAnimation.stop();
  }, [rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.pullToRefreshContainer}>
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  overlayContent: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    minWidth: 200,
    maxWidth: screenWidth * 0.8,
  },
  
  overlaySpinner: {
    marginBottom: spacing.md,
  },
  
  overlayText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  
  cancelButton: {
    marginTop: spacing.sm,
  },
  
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  
  stateText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  
  errorTitle: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  
  errorMessage: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.base,
  },
  
  retryButton: {
    minWidth: 120,
  },
  
  skeleton: {
    overflow: 'hidden',
  },
  
  userSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  
  userSkeletonAvatar: {
    marginRight: spacing.sm,
  },
  
  userSkeletonContent: {
    flex: 1,
  },
  
  userSkeletonName: {
    marginBottom: spacing.sm,
  },
  
  postSkeleton: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  
  postSkeletonContent: {
    marginVertical: spacing.sm,
  },
  
  postSkeletonActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  
  pullToRefreshContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
});

