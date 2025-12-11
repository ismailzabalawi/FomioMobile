import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle, TouchableOpacity, DimensionValue } from 'react-native';
import { useTheme } from '@/components/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

/**
 * Simple loading spinner
 */
export function LoadingSpinner({ size = 'large', color, style }: LoadingSpinnerProps) {
  const { isDark } = useTheme();
  const spinnerColor = color || (isDark ? '#f9fafb' : '#374151');

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
}

/**
 * Full screen loading overlay
 */
export function LoadingOverlay({ message = 'Loading...', visible, style }: LoadingOverlayProps) {
  const { isDark } = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)' }, style]}>
      <View style={[styles.overlayContent, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
        <ActivityIndicator
          size="large"
          color={isDark ? '#26A69A' : '#009688'}
          style={styles.overlaySpinner}
        />
        <Text style={[styles.overlayText, { color: isDark ? '#f9fafb' : '#374151' }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

interface LoadingStateProps {
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  onRetry?: () => void;
}

/**
 * Comprehensive loading state handler
 */
export function LoadingState({
  loading,
  error,
  children,
  loadingComponent,
  errorComponent,
  onRetry,
}: LoadingStateProps) {
  const { isDark } = useTheme();

  if (loading) {
    return (
      <>
        {loadingComponent || (
          <View style={styles.stateContainer}>
            <LoadingSpinner />
            <Text style={[styles.stateText, { color: isDark ? '#f9fafb' : '#374151' }]}>
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
            <Text style={[styles.errorTitle, { color: isDark ? '#fca5a5' : '#ef4444' }]}>
              Something went wrong
            </Text>
            <Text style={[styles.errorMessage, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
              {error}
            </Text>
            {onRetry && (
              <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </>
    );
  }

  return <>{children}</>;
}

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Skeleton loading placeholder
 */
export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? '#374151' : '#e5e7eb',
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton for user cards/profiles
 */
export function UserSkeleton() {
  return (
    <View style={styles.userSkeleton}>
      <Skeleton width={40} height={40} borderRadius={20} style={styles.userSkeletonAvatar} />
      <View style={styles.userSkeletonContent}>
        <Skeleton width="60%" height={16} style={styles.userSkeletonName} />
        <Skeleton width="40%" height={14} />
      </View>
    </View>
  );
}

/**
 * Skeleton for feed posts
 */
export function PostSkeleton() {
  return (
    <View style={styles.postSkeleton}>
      <UserSkeleton />
      <Skeleton width="100%" height={60} style={styles.postSkeletonContent} />
      <View style={styles.postSkeletonActions}>
        <Skeleton width={60} height={16} />
        <Skeleton width={60} height={16} />
        <Skeleton width={60} height={16} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  overlaySpinner: {
    marginBottom: 16,
  },
  overlayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  stateText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#009688',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  skeleton: {
    opacity: 0.7,
  },
  userSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userSkeletonAvatar: {
    marginRight: 12,
  },
  userSkeletonContent: {
    flex: 1,
  },
  userSkeletonName: {
    marginBottom: 8,
  },
  postSkeleton: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  postSkeletonContent: {
    marginVertical: 12,
  },
  postSkeletonActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});
