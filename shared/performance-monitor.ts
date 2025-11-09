/**
 * Performance Monitoring Utility
 * Comprehensive performance tracking for production optimization
 */

import { logger } from './logger';

// Performance metrics interface
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  networkRequests: number;
  errorCount: number;
  timestamp: number;
}

// Component performance tracking
export interface ComponentMetrics {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  memoryImpact: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private componentMetrics: Map<string, ComponentMetrics> = new Map();
  private renderStartTimes: Map<string, number> = new Map();
  private isEnabled: boolean = __DEV__; // Only enable in development by default
  
  // Enable/disable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
  
  // Start tracking component render
  startRender(componentName: string) {
    if (!this.isEnabled) return;
    
    this.renderStartTimes.set(componentName, performance.now());
  }
  
  // End tracking component render
  endRender(componentName: string) {
    if (!this.isEnabled) return;
    
    const startTime = this.renderStartTimes.get(componentName);
    if (!startTime) return;
    
    const renderTime = performance.now() - startTime;
    this.renderStartTimes.delete(componentName);
    
    // Update component metrics
    const existing = this.componentMetrics.get(componentName);
    if (existing) {
      existing.renderCount++;
      existing.lastRenderTime = renderTime;
      existing.averageRenderTime = 
        (existing.averageRenderTime * (existing.renderCount - 1) + renderTime) / existing.renderCount;
    } else {
      this.componentMetrics.set(componentName, {
        componentName,
        renderCount: 1,
        averageRenderTime: renderTime,
        lastRenderTime: renderTime,
        memoryImpact: 0, // Will be calculated separately
      });
    }
    
    // Log slow renders
    if (renderTime > 16) { // More than one frame at 60fps
      logger.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }
  
  // Track memory usage
  trackMemoryUsage() {
    if (!this.isEnabled) return;
    
    // Note: React Native doesn't have direct memory API access
    // This would be implemented with native modules in production
    const estimatedMemory = this.estimateMemoryUsage();
    
    if (estimatedMemory > 100 * 1024 * 1024) { // 100MB threshold
      logger.warn(`High memory usage detected: ${(estimatedMemory / 1024 / 1024).toFixed(2)}MB`);
    }
    
    return estimatedMemory;
  }
  
  // Estimate memory usage based on component metrics
  private estimateMemoryUsage(): number {
    // Simple estimation based on component count and complexity
    let totalEstimate = 0;
    
    this.componentMetrics.forEach((metrics) => {
      // Estimate memory impact based on render complexity
      const complexity = metrics.averageRenderTime / 16; // Relative to 60fps frame
      totalEstimate += complexity * 1024 * 1024; // 1MB per complexity unit
    });
    
    return Math.max(totalEstimate, 50 * 1024 * 1024); // Minimum 50MB baseline
  }
  
  // Track network requests
  trackNetworkRequest(url: string, duration: number, success: boolean) {
    if (!this.isEnabled) return;
    
    if (duration > 1000) { // Slow request threshold
      logger.warn(`Slow network request: ${url} took ${duration}ms`);
    }
    
    if (!success) {
      logger.error(`Failed network request: ${url}`);
    }
  }
  
  // Get performance summary
  getPerformanceSummary() {
    if (!this.isEnabled) return null;
    
    const componentSummary = Array.from(this.componentMetrics.values())
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, 10); // Top 10 slowest components
    
    return {
      totalComponents: this.componentMetrics.size,
      slowestComponents: componentSummary,
      estimatedMemoryUsage: this.estimateMemoryUsage(),
      totalRenders: Array.from(this.componentMetrics.values())
        .reduce((sum, metrics) => sum + metrics.renderCount, 0),
    };
  }
  
  // Clear metrics
  clearMetrics() {
    this.metrics = [];
    this.componentMetrics.clear();
    this.renderStartTimes.clear();
  }
  
  // Export metrics for analysis
  exportMetrics() {
    return {
      componentMetrics: Array.from(this.componentMetrics.entries()),
      summary: this.getPerformanceSummary(),
      timestamp: Date.now(),
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// HOC for automatic component performance tracking
export function withPerformanceTracking<T extends object>(
  Component: React.ComponentType<T>,
  componentName?: string
) {
  const name = componentName || Component.displayName || Component.name || 'Unknown';
  
  const WrappedComponent = (props: T) => {
    React.useEffect(() => {
      performanceMonitor.startRender(name);
      
      return () => {
        performanceMonitor.endRender(name);
      };
    });
    
    return React.createElement(Component, props);
  };
  
  WrappedComponent.displayName = `withPerformanceTracking(${name})`;
  
  return React.memo(WrappedComponent);
}

// Hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  React.useEffect(() => {
    performanceMonitor.startRender(componentName);
    
    return () => {
      performanceMonitor.endRender(componentName);
    };
  }, [componentName]);
}

// Memory leak detection hook
export function useMemoryLeakDetection(componentName: string) {
  const mountTime = React.useRef(Date.now());
  const intervalRef = React.useRef<number | undefined>(undefined);
  
  React.useEffect(() => {
    // Check memory usage periodically
    intervalRef.current = setInterval(() => {
      const memoryUsage = performanceMonitor.trackMemoryUsage();
      const uptime = Date.now() - mountTime.current;
      
      // Alert if memory usage grows significantly over time
      if (uptime > 60000 && memoryUsage && memoryUsage > 150 * 1024 * 1024) {
        logger.warn(`Potential memory leak in ${componentName}: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB after ${uptime}ms`);
      }
    }, 30000) as unknown as number; // Check every 30 seconds - cast for React Native compatibility
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [componentName]);
}

// Bundle size tracking
export const bundleAnalyzer = {
  // Track bundle chunks
  trackChunkLoad(chunkName: string, size: number) {
    if (!performanceMonitor['isEnabled']) return;
    
    logger.info(`Chunk loaded: ${chunkName} (${(size / 1024).toFixed(2)}KB)`);
    
    if (size > 500 * 1024) { // 500KB threshold
      logger.warn(`Large chunk detected: ${chunkName} is ${(size / 1024).toFixed(2)}KB`);
    }
  },
  
  // Estimate total bundle size
  estimateBundleSize(): number {
    // This would be implemented with actual bundle analysis in production
    // For now, return an estimate based on dependencies
    return 2.5 * 1024 * 1024; // 2.5MB estimate
  },
  
  // Get bundle recommendations
  getBundleRecommendations() {
    const bundleSize = this.estimateBundleSize();
    const recommendations: string[] = [];
    
    if (bundleSize > 3 * 1024 * 1024) {
      recommendations.push('Consider code splitting for large screens');
    }
    
    if (bundleSize > 5 * 1024 * 1024) {
      recommendations.push('Implement lazy loading for non-critical components');
    }
    
    return recommendations;
  },
};

// Network performance tracking
export const networkMonitor = {
  // Track API calls
  trackApiCall(endpoint: string, method: string, duration: number, success: boolean) {
    performanceMonitor.trackNetworkRequest(`${method} ${endpoint}`, duration, success);
  },
  
  // Track image loading
  trackImageLoad(url: string, duration: number, success: boolean) {
    performanceMonitor.trackNetworkRequest(`Image: ${url}`, duration, success);
  },
};

// Performance debugging utilities
export const performanceDebug = {
  // Log current performance state
  logPerformanceState() {
    const summary = performanceMonitor.getPerformanceSummary();
    if (summary) {
      logger.info('Performance Summary:', summary);
    }
  },
  
  // Start performance profiling
  startProfiling() {
    performanceMonitor.setEnabled(true);
    performanceMonitor.clearMetrics();
    logger.info('Performance profiling started');
  },
  
  // Stop profiling and export results
  stopProfiling() {
    const metrics = performanceMonitor.exportMetrics();
    performanceMonitor.setEnabled(false);
    logger.info('Performance profiling stopped', metrics);
    return metrics;
  },
};

// React import for HOC
import React from 'react';

