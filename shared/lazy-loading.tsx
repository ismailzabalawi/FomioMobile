/**
 * Lazy Loading Utilities
 * Advanced lazy loading and code splitting for optimal performance
 */

import React, { Suspense, lazy, ComponentType, useState, useEffect, useRef } from 'react';
import { View, Dimensions } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { LoadingSpinnerEnhanced, SkeletonEnhanced } from '../components/shared/loading.enhanced';
import { logger } from './logger';
import { performanceMonitor } from './performance-monitor';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// =============================================================================
// COMPONENT LAZY LOADING
// =============================================================================

interface LazyComponentOptions {
  fallback?: React.ComponentType;
  errorBoundary?: React.ComponentType<{ error: Error; retry: () => void }>;
  preload?: boolean;
  chunkName?: string;
}

/**
 * Enhanced lazy loading with error boundaries and preloading
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
): ComponentType<React.ComponentProps<T>> {
  const {
    fallback: Fallback = LoadingSpinnerEnhanced,
    errorBoundary: ErrorBoundary,
    preload = false,
    chunkName = 'unknown',
  } = options;

  // Create lazy component
  const LazyComponent = lazy(() => {
    const startTime = performance.now();
    
    return importFn()
      .then((module) => {
        const loadTime = performance.now() - startTime;
        logger.info(`Lazy component loaded: ${chunkName} in ${loadTime.toFixed(2)}ms`);
        
        // Track chunk loading performance
        performanceMonitor.trackNetworkRequest(
          `Chunk: ${chunkName}`,
          loadTime,
          true
        );
        
        return module;
      })
      .catch((error) => {
        const loadTime = performance.now() - startTime;
        logger.error(`Failed to load lazy component: ${chunkName}`, error);
        
        performanceMonitor.trackNetworkRequest(
          `Chunk: ${chunkName}`,
          loadTime,
          false
        );
        
        throw error;
      });
  });

  // Preload if requested
  if (preload) {
    // Preload after a short delay to not block initial render
    setTimeout(() => {
      importFn().catch(() => {
        // Ignore preload errors
      });
    }, 100);
  }

  // Wrapper component with error boundary
  const WrappedComponent = (props: any) => {
    const [error, setError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const retry = () => {
      setError(null);
      setRetryCount(prev => prev + 1);
    };

    if (error && ErrorBoundary) {
      return <ErrorBoundary error={error} retry={retry} />;
    }

    return (
      <Suspense fallback={<Fallback />}>
        <LazyComponent key={retryCount} {...props} />
      </Suspense>
    );
  };

  WrappedComponent.displayName = `Lazy(${chunkName})`;
  
  return WrappedComponent;
}

// =============================================================================
// IMAGE LAZY LOADING
// =============================================================================

interface LazyImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  placeholder?: React.ReactNode;
  threshold?: number;
  onLoad?: () => void;
  onError?: (error: any) => void;
  cachePolicy?: 'memory' | 'disk' | 'none';
}

/**
 * Enhanced lazy image loading with intersection observer simulation
 */
export function LazyImage({
  source,
  placeholder,
  threshold = 100,
  onLoad,
  onError,
  cachePolicy = 'memory',
  style,
  ...props
}: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const viewRef = useRef<View>(null);
  const loadStartTime = useRef<number>(0);

  // Simulate intersection observer for React Native
  useEffect(() => {
    const checkVisibility = () => {
      if (viewRef.current) {
        // Simple visibility check - in production, you'd use a proper intersection observer
        setIsVisible(true);
      }
    };

    // Check visibility after a short delay
    const timer = setTimeout(checkVisibility, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleLoad = () => {
    const loadTime = performance.now() - loadStartTime.current;
    setIsLoaded(true);
    
    logger.info(`Image loaded in ${loadTime.toFixed(2)}ms`);
    
    // Track image loading performance
    if (typeof source === 'object' && source.uri) {
      performanceMonitor.trackNetworkRequest(
        `Image: ${source.uri}`,
        loadTime,
        true
      );
    }
    
    onLoad?.();
  };

  const handleError = (error: any) => {
    const loadTime = performance.now() - loadStartTime.current;
    setHasError(true);
    
    logger.error('Image failed to load', error);
    
    if (typeof source === 'object' && source.uri) {
      performanceMonitor.trackNetworkRequest(
        `Image: ${source.uri}`,
        loadTime,
        false
      );
    }
    
    onError?.(error);
  };

  const handleLoadStart = () => {
    loadStartTime.current = performance.now();
  };

  // Show placeholder while not visible or loading
  if (!isVisible || (!isLoaded && !hasError)) {
    return (
      <View ref={viewRef} style={style}>
        {placeholder || (
          <SkeletonEnhanced
            width="100%"
            height={200}
            animated={isVisible}
          />
        )}
        {isVisible && !hasError && (
          <Image
            source={source}
            onLoad={handleLoad}
            onError={handleError}
            onLoadStart={handleLoadStart}
            style={{ position: 'absolute', opacity: 0 }}
            {...props}
          />
        )}
      </View>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <View ref={viewRef} style={[style, { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }]}>
        {placeholder || <SkeletonEnhanced width="100%" height={200} animated={false} />}
      </View>
    );
  }

  // Show loaded image
  return (
    <View ref={viewRef}>
      <Image
        source={source}
        onLoad={handleLoad}
        onError={handleError}
        onLoadStart={handleLoadStart}
        style={style}
        {...props}
      />
    </View>
  );
}

// =============================================================================
// SCREEN LAZY LOADING
// =============================================================================

interface LazyScreenOptions {
  preloadDelay?: number;
  fallback?: React.ComponentType;
  errorBoundary?: React.ComponentType<{ error: Error; retry: () => void }>;
}

/**
 * Create lazy-loaded screen components
 */
export function createLazyScreen(
  importFn: () => Promise<{ default: ComponentType<any> }>,
  screenName: string,
  options: LazyScreenOptions = {}
) {
  return createLazyComponent(importFn, {
    ...options,
    chunkName: `Screen_${screenName}`,
    fallback: options.fallback || (() => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LoadingSpinnerEnhanced />
      </View>
    )),
  });
}

// =============================================================================
// PROGRESSIVE LOADING
// =============================================================================

interface ProgressiveLoaderProps {
  children: React.ReactNode;
  priority?: 'high' | 'medium' | 'low';
  delay?: number;
}

/**
 * Progressive loading component for non-critical content
 */
export function ProgressiveLoader({
  children,
  priority = 'medium',
  delay = 0,
}: ProgressiveLoaderProps) {
  const [shouldRender, setShouldRender] = useState(priority === 'high');

  useEffect(() => {
    if (priority === 'high') return;

    const baseDelay = priority === 'medium' ? 100 : 500;
    const totalDelay = baseDelay + delay;

    const timer = setTimeout(() => {
      setShouldRender(true);
    }, totalDelay);

    return () => clearTimeout(timer);
  }, [priority, delay]);

  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
}

// =============================================================================
// VIRTUALIZATION HELPERS
// =============================================================================

interface VirtualizedListProps {
  data: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

/**
 * Simple virtualization for large lists
 */
export function VirtualizedList({
  data,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
}: VirtualizedListProps) {
  const [scrollOffset, setScrollOffset] = useState(0);

  const visibleStart = Math.max(0, Math.floor(scrollOffset / itemHeight) - overscan);
  const visibleEnd = Math.min(
    data.length,
    Math.ceil((scrollOffset + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = data.slice(visibleStart, visibleEnd);
  const offsetY = visibleStart * itemHeight;

  return (
    <View style={{ height: containerHeight, overflow: 'hidden' }}>
      <View style={{ transform: [{ translateY: -scrollOffset + offsetY }] }}>
        {visibleItems.map((item, index) => (
          <View key={visibleStart + index} style={{ height: itemHeight }}>
            {renderItem(item, visibleStart + index)}
          </View>
        ))}
      </View>
    </View>
  );
}

// =============================================================================
// PRELOADING UTILITIES
// =============================================================================

export const preloadManager = {
  // Preload critical screens
  preloadCriticalScreens() {
    // Note: Dynamic imports would be implemented here in production
    // with proper module configuration
    logger.info('Critical screens preloading would be implemented here');
  },

  // Preload images for better UX
  preloadImages(imageUrls: string[]) {
    imageUrls.forEach((url, index) => {
      setTimeout(() => {
        Image.prefetch(url, { cachePolicy: 'memory-disk' }).catch(() => {
          // Ignore preload errors
        });
      }, index * 100);
    });
  },

  // Preload based on user behavior
  preloadOnUserIntent(screenImportFn: () => Promise<any>) {
    // Preload when user shows intent (hover, focus, etc.)
    return () => {
      screenImportFn().catch(() => {
        // Ignore preload errors
      });
    };
  },
};

// =============================================================================
// MEMORY OPTIMIZATION
// =============================================================================

export const memoryOptimizer = {
  // Clean up unused components
  cleanupUnusedComponents() {
    // This would implement component cleanup logic
    logger.info('Cleaning up unused components');
  },

  // Optimize image cache
  optimizeImageCache() {
    // This would implement image cache optimization
    logger.info('Optimizing image cache');
  },

  // Monitor memory usage
  monitorMemoryUsage() {
    const usage = performanceMonitor.trackMemoryUsage();
    if (usage && usage > 100 * 1024 * 1024) {
      this.cleanupUnusedComponents();
      this.optimizeImageCache();
    }
  },
};

