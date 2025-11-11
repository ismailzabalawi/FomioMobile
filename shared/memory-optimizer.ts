/**
 * Memory Optimization Utilities
 * Advanced memory management and leak prevention for React Native
 */

import { logger } from './logger';
import { performanceMonitor } from './performance-monitor';

// Memory usage tracking interface
interface MemorySnapshot {
  timestamp: number;
  estimatedUsage: number;
  componentCount: number;
  listenerCount: number;
  timerCount: number;
}

// Component cleanup tracking
interface ComponentCleanup {
  componentName: string;
  mountTime: number;
  cleanupFunctions: (() => void)[];
  timers: (ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>)[];
  listeners: { remove: () => void }[];
}

class MemoryOptimizer {
  private snapshots: MemorySnapshot[] = [];
  private componentCleanups: Map<string, ComponentCleanup> = new Map();
  private globalTimers: Set<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>> = new Set();
  private globalListeners: Set<{ remove: () => void }> = new Set();
  private isMonitoring: boolean = false;
  private monitoringInterval?: ReturnType<typeof setInterval>;
  
  // Start memory monitoring
  startMonitoring(intervalMs: number = 30000) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    logger.info('Memory monitoring started');
    
    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot();
      this.checkForLeaks();
    }, intervalMs);
  }
  
  // Stop memory monitoring
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    logger.info('Memory monitoring stopped');
  }
  
  // Take memory snapshot
  takeSnapshot() {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      estimatedUsage: this.estimateMemoryUsage(),
      componentCount: this.componentCleanups.size,
      listenerCount: this.globalListeners.size,
      timerCount: this.globalTimers.size,
    };
    
    this.snapshots.push(snapshot);
    
    // Keep only last 20 snapshots
    if (this.snapshots.length > 20) {
      this.snapshots = this.snapshots.slice(-20);
    }
    
    return snapshot;
  }
  
  // Estimate current memory usage
  estimateMemoryUsage(): number {
    // Base memory usage estimate
    let estimate = 50 * 1024 * 1024; // 50MB baseline
    
    // Add component overhead
    estimate += this.componentCleanups.size * 1024 * 1024; // 1MB per component
    
    // Add listener overhead
    estimate += this.globalListeners.size * 1024; // 1KB per listener
    
    // Add timer overhead
    estimate += this.globalTimers.size * 512; // 512B per timer
    
    return estimate;
  }
  
  // Check for memory leaks
  checkForLeaks() {
    const currentSnapshot = this.snapshots[this.snapshots.length - 1];
    if (!currentSnapshot) return;
    
    // Check for growing memory usage
    if (this.snapshots.length >= 5) {
      const oldSnapshot = this.snapshots[this.snapshots.length - 5];
      const growthRate = (currentSnapshot.estimatedUsage - oldSnapshot.estimatedUsage) / oldSnapshot.estimatedUsage;
      
      if (growthRate > 0.2) { // 20% growth
        logger.warn(`Potential memory leak detected: ${(growthRate * 100).toFixed(1)}% growth in 5 snapshots`);
        this.reportMemoryState();
      }
    }
    
    // Check for excessive components
    if (currentSnapshot.componentCount > 50) {
      logger.warn(`High component count: ${currentSnapshot.componentCount} components tracked`);
    }
    
    // Check for excessive listeners
    if (currentSnapshot.listenerCount > 100) {
      logger.warn(`High listener count: ${currentSnapshot.listenerCount} listeners tracked`);
    }
    
    // Check for excessive timers
    if (currentSnapshot.timerCount > 20) {
      logger.warn(`High timer count: ${currentSnapshot.timerCount} timers tracked`);
    }
  }
  
  // Register component for cleanup tracking
  registerComponent(componentName: string): string {
    const id = `${componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.componentCleanups.set(id, {
      componentName,
      mountTime: Date.now(),
      cleanupFunctions: [],
      timers: [],
      listeners: [],
    });
    
    return id;
  }
  
  // Unregister component and perform cleanup
  unregisterComponent(id: string) {
    const cleanup = this.componentCleanups.get(id);
    if (!cleanup) return;
    
    // Execute all cleanup functions
    cleanup.cleanupFunctions.forEach(fn => {
      try {
        fn();
      } catch (error) {
        logger.error(`Error in cleanup function for ${cleanup.componentName}:`, error);
      }
    });
    
    // Clear all timers
    cleanup.timers.forEach(timer => {
      clearTimeout(timer);
      clearInterval(timer);
      this.globalTimers.delete(timer);
    });
    
    // Remove all listeners
    cleanup.listeners.forEach(listener => {
      try {
        listener.remove();
        this.globalListeners.delete(listener);
      } catch (error) {
        logger.error(`Error removing listener for ${cleanup.componentName}:`, error);
      }
    });
    
    this.componentCleanups.delete(id);
    
    const lifetime = Date.now() - cleanup.mountTime;
    logger.debug(`Component ${cleanup.componentName} cleaned up after ${lifetime}ms`);
  }
  
  // Add cleanup function to component
  addCleanupFunction(componentId: string, cleanupFn: () => void) {
    const cleanup = this.componentCleanups.get(componentId);
    if (cleanup) {
      cleanup.cleanupFunctions.push(cleanupFn);
    }
  }
  
  // Track timer for component
  trackTimer(componentId: string, timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>) {
    const cleanup = this.componentCleanups.get(componentId);
    if (cleanup) {
      cleanup.timers.push(timer);
      this.globalTimers.add(timer);
    }
  }
  
  // Track listener for component
  trackListener(componentId: string, listener: { remove: () => void }) {
    const cleanup = this.componentCleanups.get(componentId);
    if (cleanup) {
      cleanup.listeners.push(listener);
      this.globalListeners.add(listener);
    }
  }
  
  // Force garbage collection (if available)
  forceGarbageCollection() {
    // Note: gc() is not available in React Native by default
    // This would need to be implemented with native modules
    if (typeof global.gc === 'function') {
      global.gc();
      logger.info('Forced garbage collection');
    } else {
      logger.warn('Garbage collection not available');
    }
  }
  
  // Clean up inactive components
  cleanupInactiveComponents(maxAge: number = 300000) { // 5 minutes
    const now = Date.now();
    const toCleanup: string[] = [];
    
    this.componentCleanups.forEach((cleanup, id) => {
      if (now - cleanup.mountTime > maxAge) {
        toCleanup.push(id);
      }
    });
    
    toCleanup.forEach(id => {
      logger.warn(`Cleaning up inactive component: ${this.componentCleanups.get(id)?.componentName}`);
      this.unregisterComponent(id);
    });
    
    return toCleanup.length;
  }
  
  // Get memory report
  getMemoryReport() {
    const currentSnapshot = this.takeSnapshot();
    
    return {
      current: currentSnapshot,
      history: this.snapshots.slice(-10), // Last 10 snapshots
      components: Array.from(this.componentCleanups.entries()).map(([id, cleanup]) => ({
        id,
        name: cleanup.componentName,
        age: Date.now() - cleanup.mountTime,
        cleanupCount: cleanup.cleanupFunctions.length,
        timerCount: cleanup.timers.length,
        listenerCount: cleanup.listeners.length,
      })),
      summary: {
        totalComponents: this.componentCleanups.size,
        totalTimers: this.globalTimers.size,
        totalListeners: this.globalListeners.size,
        estimatedMemory: this.formatBytes(currentSnapshot.estimatedUsage),
      },
    };
  }
  
  // Report current memory state
  reportMemoryState() {
    const report = this.getMemoryReport();
    logger.info('Memory State Report:', report.summary);
    
    // Log components with high resource usage
    const heavyComponents = report.components
      .filter(comp => comp.timerCount > 5 || comp.listenerCount > 10)
      .sort((a, b) => (b.timerCount + b.listenerCount) - (a.timerCount + a.listenerCount));
    
    if (heavyComponents.length > 0) {
      logger.warn('Components with high resource usage:', heavyComponents.slice(0, 5));
    }
  }
  
  // Clear all tracking data
  clearAll() {
    // Cleanup all components
    Array.from(this.componentCleanups.keys()).forEach(id => {
      this.unregisterComponent(id);
    });
    
    // Clear snapshots
    this.snapshots = [];
    
    logger.info('All memory tracking data cleared');
  }
  
  // Format bytes for display
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Global memory optimizer instance
export const memoryOptimizer = new MemoryOptimizer();

// React hook for automatic memory management
export function useMemoryOptimization(componentName: string) {
  const [componentId] = React.useState(() => 
    memoryOptimizer.registerComponent(componentName)
  );
  
  React.useEffect(() => {
    return () => {
      memoryOptimizer.unregisterComponent(componentId);
    };
  }, [componentId]);
  
  // Return utilities for the component
  return {
    addCleanup: (cleanupFn: () => void) => 
      memoryOptimizer.addCleanupFunction(componentId, cleanupFn),
    
    trackTimer: (timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>) => 
      memoryOptimizer.trackTimer(componentId, timer),
    
    trackListener: (listener: { remove: () => void }) => 
      memoryOptimizer.trackListener(componentId, listener),
  };
}

// Enhanced useEffect hook with automatic cleanup tracking
export function useEffectWithCleanup(
  effect: () => (() => void) | void,
  deps: React.DependencyList | undefined,
  componentName: string
) {
  const { addCleanup } = useMemoryOptimization(componentName);
  
  React.useEffect(() => {
    const cleanup = effect();
    if (cleanup) {
      addCleanup(cleanup);
    }
  }, deps);
}

// Enhanced setTimeout with automatic tracking
export function useTrackedTimeout(
  callback: () => void,
  delay: number,
  componentName: string
) {
  const { trackTimer } = useMemoryOptimization(componentName);
  
  React.useEffect(() => {
    const timer = setTimeout(callback, delay);
    trackTimer(timer);
    
    return () => clearTimeout(timer);
  }, [callback, delay, trackTimer]);
}

// Enhanced setInterval with automatic tracking
export function useTrackedInterval(
  callback: () => void,
  delay: number,
  componentName: string
) {
  const { trackTimer } = useMemoryOptimization(componentName);
  
  React.useEffect(() => {
    const timer = setInterval(callback, delay);
    trackTimer(timer);
    
    return () => clearInterval(timer);
  }, [callback, delay, trackTimer]);
}

// Memory debugging utilities
export const memoryDebug = {
  // Start monitoring with detailed logging
  startDetailedMonitoring() {
    memoryOptimizer.startMonitoring(10000); // Every 10 seconds
    logger.info('Detailed memory monitoring started');
  },
  
  // Stop monitoring
  stopMonitoring() {
    memoryOptimizer.stopMonitoring();
  },
  
  // Force cleanup of inactive components
  forceCleanup() {
    const cleaned = memoryOptimizer.cleanupInactiveComponents();
    logger.info(`Forced cleanup of ${cleaned} inactive components`);
    return cleaned;
  },
  
  // Get detailed memory report
  getDetailedReport() {
    return memoryOptimizer.getMemoryReport();
  },
  
  // Log current memory state
  logMemoryState() {
    memoryOptimizer.reportMemoryState();
  },
};

// React import for hooks
import React from 'react';

