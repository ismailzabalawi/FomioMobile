/**
 * Debug Logger for Icon Flickering Issue
 * 
 * Tracks component renders, prop changes, hook returns, and byte object creation
 * to identify the root cause of icon flickering.
 * 
 * Enable/disable by setting ENABLE_ICON_FLICKER_DEBUG to true/false
 */

declare const __DEV__: boolean;

const ENABLE_ICON_FLICKER_DEBUG = __DEV__ && true; // Set to false to disable

interface RenderLog {
  component: string;
  byteId?: number;
  timestamp: number;
  reason?: string;
  props?: any;
  prevProps?: any;
}

interface HookLog {
  hook: string;
  byteId?: number | string;
  timestamp: number;
  returnValue: any;
  dependencies?: any[];
}

interface ByteLog {
  action: 'created' | 'cached' | 'updated';
  byteId: number;
  timestamp: number;
  isNew: boolean;
  reason?: string;
}

class IconFlickerDebugger {
  private renderLogs: RenderLog[] = [];
  private hookLogs: HookLog[] = [];
  private byteLogs: ByteLog[] = [];
  private maxLogs = 100; // Keep last 100 logs

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getSeconds()}.${date.getMilliseconds().toString().padStart(3, '0')}`;
  }

  private truncateLogs() {
    if (this.renderLogs.length > this.maxLogs) {
      this.renderLogs = this.renderLogs.slice(-this.maxLogs);
    }
    if (this.hookLogs.length > this.maxLogs) {
      this.hookLogs = this.hookLogs.slice(-this.maxLogs);
    }
    if (this.byteLogs.length > this.maxLogs) {
      this.byteLogs = this.byteLogs.slice(-this.maxLogs);
    }
  }

  logRender(component: string, byteId?: number, reason?: string, props?: any, prevProps?: any) {
    if (!ENABLE_ICON_FLICKER_DEBUG) return;

    const log: RenderLog = {
      component,
      byteId,
      timestamp: Date.now(),
      reason,
      props: props ? this.sanitizeProps(props) : undefined,
      prevProps: prevProps ? this.sanitizeProps(prevProps) : undefined,
    };

    this.renderLogs.push(log);
    this.truncateLogs();

    const time = this.formatTime(log.timestamp);
    const byteInfo = byteId ? `[Byte ${byteId}]` : '';
    const reasonInfo = reason ? ` | Reason: ${reason}` : '';
    
    console.log(
      `🎨 [${time}] RENDER: ${component} ${byteInfo}${reasonInfo}`
    );

    // Log prop changes if provided
    if (prevProps && props) {
      const changes = this.detectPropChanges(prevProps, props);
      if (changes.length > 0) {
        console.log(`   📝 Prop changes: ${changes.join(', ')}`);
      }
    }
  }

  logHook(hook: string, byteId: number | string | undefined, returnValue: any, dependencies?: any[]) {
    if (!ENABLE_ICON_FLICKER_DEBUG) return;

    const log: HookLog = {
      hook,
      byteId,
      timestamp: Date.now(),
      returnValue: this.sanitizeReturnValue(returnValue),
      dependencies,
    };

    this.hookLogs.push(log);
    this.truncateLogs();

    const time = this.formatTime(log.timestamp);
    const byteInfo = byteId ? `[Byte ${byteId}]` : '';
    const isNewRef = this.isNewReference(hook, byteId, returnValue);
    const refInfo = isNewRef ? ' 🔴 NEW REF' : ' 🟢 SAME REF';

    console.log(
      `🪝 [${time}] HOOK: ${hook} ${byteInfo}${refInfo}`
    );

    // Log key return values
    if (returnValue && typeof returnValue === 'object') {
      const keys = Object.keys(returnValue).slice(0, 5);
      const preview = keys.map(key => {
        const value = returnValue[key];
        if (typeof value === 'function') return `${key}: fn`;
        if (typeof value === 'boolean') return `${key}: ${value}`;
        if (typeof value === 'number') return `${key}: ${value}`;
        return `${key}: ${typeof value}`;
      }).join(', ');
      console.log(`   📦 Returns: {${preview}${keys.length < Object.keys(returnValue).length ? '...' : ''}}`);
    }
  }

  logByte(action: 'created' | 'cached' | 'updated', byteId: number, isNew: boolean, reason?: string) {
    if (!ENABLE_ICON_FLICKER_DEBUG) return;

    const log: ByteLog = {
      action,
      byteId,
      timestamp: Date.now(),
      isNew,
      reason,
    };

    this.byteLogs.push(log);
    this.truncateLogs();

    const time = this.formatTime(log.timestamp);
    const actionEmoji = action === 'created' ? '🆕' : action === 'cached' ? '💾' : '🔄';
    const refInfo = isNew ? ' 🔴 NEW' : ' 🟢 CACHED';

    console.log(
      `📦 [${time}] BYTE ${actionEmoji}: Byte ${byteId}${refInfo}${reason ? ` | ${reason}` : ''}`
    );
  }

  logIconRecreation(iconName: string, byteId: number | string, reason: string) {
    if (!ENABLE_ICON_FLICKER_DEBUG) return;

    const time = this.formatTime(Date.now());
    console.log(
      `🎯 [${time}] ICON RECREATED: ${iconName} [Byte ${byteId}] | Reason: ${reason}`
    );
  }

  private sanitizeProps(props: any): any {
    if (!props || typeof props !== 'object') return props;
    
    const sanitized: any = {};
    for (const key in props) {
      if (key === 'byte') {
        sanitized[key] = {
          id: props[key]?.id,
          title: props[key]?.title?.substring(0, 30),
          isLiked: props[key]?.isLiked,
          isBookmarked: props[key]?.isBookmarked,
          stats: props[key]?.stats,
          teret: props[key]?.teret,
        };
      } else if (typeof props[key] === 'function') {
        sanitized[key] = 'fn';
      } else if (typeof props[key] === 'object' && props[key] !== null) {
        sanitized[key] = '[object]';
      } else {
        sanitized[key] = props[key];
      }
    }
    return sanitized;
  }

  private sanitizeReturnValue(value: any): any {
    if (!value || typeof value !== 'object') return value;
    
    const sanitized: any = {};
    for (const key in value) {
      if (typeof value[key] === 'function') {
        sanitized[key] = 'fn';
      } else if (typeof value[key] === 'object' && value[key] !== null) {
        sanitized[key] = '[object]';
      } else {
        sanitized[key] = value[key];
      }
    }
    return sanitized;
  }

  private detectPropChanges(prev: any, next: any): string[] {
    if (!prev || !next) return [];
    
    const changes: string[] = [];
    
    // Check byte props
    if (prev.byte && next.byte) {
      if (prev.byte.id !== next.byte.id) changes.push('byte.id');
      if (prev.byte.title !== next.byte.title) changes.push('byte.title');
      if (prev.byte.isLiked !== next.byte.isLiked) changes.push('byte.isLiked');
      if (prev.byte.isBookmarked !== next.byte.isBookmarked) changes.push('byte.isBookmarked');
      if (prev.byte.stats?.likes !== next.byte.stats?.likes) changes.push('byte.stats.likes');
      if (prev.byte.stats?.replies !== next.byte.stats?.replies) changes.push('byte.stats.replies');
      if (prev.byte.teret?.id !== next.byte.teret?.id) changes.push('byte.teret.id');
      if (prev.byte.teret?.name !== next.byte.teret?.name) changes.push('byte.teret.name');
    }
    
    // Check other props
    if (prev.onPress !== next.onPress) changes.push('onPress');
    if (prev.showSeparator !== next.showSeparator) changes.push('showSeparator');
    if (prev.icon !== next.icon) changes.push('icon');
    if (prev.count !== next.count) changes.push('count');
    
    return changes;
  }

  private lastHookReturns = new Map<string, any>();

  private isNewReference(hook: string, byteId: number | string | undefined, returnValue: any): boolean {
    const key = `${hook}-${byteId || 'global'}`;
    const lastReturn = this.lastHookReturns.get(key);
    
    if (!lastReturn) {
      this.lastHookReturns.set(key, returnValue);
      return true; // First call is always "new"
    }
    
    const isNew = lastReturn !== returnValue;
    if (isNew) {
      this.lastHookReturns.set(key, returnValue);
    }
    
    return isNew;
  }

  getSummary(): string {
    if (!ENABLE_ICON_FLICKER_DEBUG) return 'Debug logging disabled';

    const recentRenders = this.renderLogs.slice(-20);
    const recentHooks = this.hookLogs.slice(-20);
    const recentBytes = this.byteLogs.slice(-20);

    let summary = '\n📊 ICON FLICKER DEBUG SUMMARY\n';
    summary += '='.repeat(50) + '\n\n';

    summary += `Recent Renders (${recentRenders.length}):\n`;
    recentRenders.forEach(log => {
      const time = this.formatTime(log.timestamp);
      const byteInfo = log.byteId ? `[Byte ${log.byteId}]` : '';
      summary += `  [${time}] ${log.component} ${byteInfo}${log.reason ? ` | ${log.reason}` : ''}\n`;
    });

    summary += `\nRecent Hook Calls (${recentHooks.length}):\n`;
    recentHooks.forEach(log => {
      const time = this.formatTime(log.timestamp);
      const byteInfo = log.byteId ? `[Byte ${log.byteId}]` : '';
      summary += `  [${time}] ${log.hook} ${byteInfo}\n`;
    });

    summary += `\nRecent Byte Operations (${recentBytes.length}):\n`;
    recentBytes.forEach(log => {
      const time = this.formatTime(log.timestamp);
      summary += `  [${time}] Byte ${log.byteId} ${log.action}${log.isNew ? ' (NEW)' : ' (CACHED)'}\n`;
    });

    return summary;
  }

  clear() {
    this.renderLogs = [];
    this.hookLogs = [];
    this.byteLogs = [];
    this.lastHookReturns.clear();
  }
}

export const iconFlickerDebug = new IconFlickerDebugger();

// Helper to log summary on demand (call from console: iconFlickerDebug.getSummary())
if (ENABLE_ICON_FLICKER_DEBUG && typeof global !== 'undefined') {
  (global as any).iconFlickerDebug = iconFlickerDebug;
}

