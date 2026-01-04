/**
 * Deep Linking Unit Tests
 * 
 * Tests for the deep link resolver to ensure URL parsing and routing works correctly.
 * Run with: npx jest __tests__/lib/deep-linking.test.ts
 */

import { resolveDeepLink, isFomioDeepLink, deepLinkRequiresAuth } from '../../lib/deep-link-handler';
import { requiresAuth } from '../../lib/deep-linking';

// Mock expo-linking
jest.mock('expo-linking', () => ({
  parse: (url: string) => {
    // Simple parser that mimics expo-linking behavior
    const match = url.match(/^(\w+):\/\/\/?([^/?]*)([^?]*)(\?.*)?$/);
    if (!match) {
      return { scheme: null, hostname: null, path: null, queryParams: {} };
    }
    
    const [, scheme, hostname, pathPart, queryPart] = match;
    
    // Parse query params
    const queryParams: Record<string, string> = {};
    if (queryPart) {
      const params = new URLSearchParams(queryPart.slice(1));
      params.forEach((value, key) => {
        queryParams[key] = value;
      });
    }
    
    return {
      scheme: scheme || null,
      hostname: hostname || null,
      path: pathPart ? pathPart.slice(1) : null, // Remove leading slash
      queryParams,
    };
  },
}));

// Mock logger
jest.mock('../../shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('resolveDeepLink', () => {
  describe('host/path normalization', () => {
    it('parses byte with double slash', () => {
      const result = resolveDeepLink('fomio://byte/123');
      expect(result?.path).toBe('/feed/123');
      expect(result?.isAuth).toBe(false);
    });

    it('parses byte with triple slash', () => {
      const result = resolveDeepLink('fomio:///byte/123');
      expect(result?.path).toBe('/feed/123');
    });

    it('parses byte with comments', () => {
      const result = resolveDeepLink('fomio://byte/123/comments');
      expect(result?.path).toBe('/feed/123?showComments=true');
    });

    it('parses byte without trailing content', () => {
      const result = resolveDeepLink('fomio://byte/456');
      expect(result?.path).toBe('/feed/456');
    });
  });

  describe('query params', () => {
    it('handles search with query', () => {
      const result = resolveDeepLink('fomio://search?q=react');
      expect(result?.path).toContain('/(tabs)/search');
      expect(result?.path).toContain('q=react');
    });

    it('handles compose with teret', () => {
      const result = resolveDeepLink('fomio://compose?teret=design');
      expect(result?.path).toContain('/compose');
      expect(result?.path).toContain('teret=design');
    });

    it('handles encoded query params', () => {
      const result = resolveDeepLink('fomio://search?q=hello%20world');
      expect(result?.path).toContain('hello%20world');
    });

    it('handles search without query', () => {
      const result = resolveDeepLink('fomio://search');
      expect(result?.path).toBe('/(tabs)/search');
    });

    it('handles compose without teret', () => {
      const result = resolveDeepLink('fomio://compose');
      expect(result?.path).toBe('/compose');
    });
  });

  describe('legacy aliases', () => {
    it('maps topic to byte', () => {
      const result = resolveDeepLink('fomio://topic/456');
      expect(result?.path).toBe('/feed/456');
    });

    it('maps u to profile', () => {
      const result = resolveDeepLink('fomio://u/ismail');
      expect(result?.path).toBe('/profile/ismail');
    });

    it('maps t to byte', () => {
      const result = resolveDeepLink('fomio://t/789');
      expect(result?.path).toBe('/feed/789');
    });
  });

  describe('auth carve-out', () => {
    it('identifies auth/callback as auth path', () => {
      const result = resolveDeepLink('fomio://auth/callback?payload=xyz');
      expect(result?.isAuth).toBe(true);
      expect(result?.path).toContain('/auth/callback');
      expect(result?.path).toContain('payload=');
    });

    it('identifies auth_redirect as auth path', () => {
      const result = resolveDeepLink('fomio://auth_redirect?payload=xyz');
      expect(result?.isAuth).toBe(true);
    });

    it('handles auth callback without payload', () => {
      const result = resolveDeepLink('fomio://auth/callback');
      expect(result?.isAuth).toBe(true);
    });
  });

  describe('fallback', () => {
    it('falls back to home for unknown paths', () => {
      const result = resolveDeepLink('fomio://something/weird');
      expect(result?.path).toBe('/(tabs)');
      expect(result?.isAuth).toBe(false);
    });

    it('returns null for non-fomio scheme', () => {
      const result = resolveDeepLink('https://google.com');
      expect(result).toBeNull();
    });

    it('returns null for http scheme', () => {
      const result = resolveDeepLink('http://example.com');
      expect(result).toBeNull();
    });
  });

  describe('home', () => {
    it('handles empty path', () => {
      const result = resolveDeepLink('fomio://');
      expect(result?.path).toBe('/(tabs)');
    });

    it('handles home path', () => {
      const result = resolveDeepLink('fomio://home');
      expect(result?.path).toBe('/(tabs)');
    });
  });

  describe('content routes', () => {
    it('resolves teret by slug', () => {
      const result = resolveDeepLink('fomio://teret/design');
      expect(result?.path).toBe('/teret/design');
    });

    it('resolves teret by ID', () => {
      const result = resolveDeepLink('fomio://teret/id/5');
      expect(result?.path).toBe('/teret/5?byId=true');
    });

    it('resolves hub by slug', () => {
      const result = resolveDeepLink('fomio://hub/technology');
      expect(result?.path).toBe('/hub/technology');
    });

    it('resolves hub by ID', () => {
      const result = resolveDeepLink('fomio://hub/id/3');
      expect(result?.path).toBe('/hub/3?byId=true');
    });

    it('resolves profile by username', () => {
      const result = resolveDeepLink('fomio://profile/johndoe');
      expect(result?.path).toBe('/profile/johndoe');
    });

    it('resolves me to profile tab', () => {
      const result = resolveDeepLink('fomio://me');
      expect(result?.path).toBe('/(tabs)/profile');
    });

    it('resolves notifications', () => {
      const result = resolveDeepLink('fomio://notifications');
      expect(result?.path).toBe('/(tabs)/notifications');
    });
  });

  describe('settings routes', () => {
    it('resolves settings root', () => {
      const result = resolveDeepLink('fomio://settings');
      expect(result?.path).toBe('/(profile)/settings');
    });

    it('resolves settings/profile', () => {
      const result = resolveDeepLink('fomio://settings/profile');
      expect(result?.path).toBe('/(profile)/edit-profile');
    });

    it('resolves settings/notifications', () => {
      const result = resolveDeepLink('fomio://settings/notifications');
      expect(result?.path).toBe('/(profile)/notification-settings');
    });
  });
});

describe('isFomioDeepLink', () => {
  it('returns true for fomio scheme', () => {
    expect(isFomioDeepLink('fomio://byte/123')).toBe(true);
    expect(isFomioDeepLink('fomio://home')).toBe(true);
    expect(isFomioDeepLink('fomio://')).toBe(true);
  });

  it('returns false for other schemes', () => {
    expect(isFomioDeepLink('https://example.com')).toBe(false);
    expect(isFomioDeepLink('http://example.com')).toBe(false);
    expect(isFomioDeepLink('tel:1234567890')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isFomioDeepLink('')).toBe(false);
    expect(isFomioDeepLink('not a url')).toBe(false);
  });
});

describe('requiresAuth', () => {
  it('returns true for auth-required paths', () => {
    expect(requiresAuth('me')).toBe(true);
    expect(requiresAuth('notifications')).toBe(true);
    expect(requiresAuth('compose')).toBe(true);
    expect(requiresAuth('compose?teret=design')).toBe(true);
    expect(requiresAuth('settings')).toBe(true);
    expect(requiresAuth('settings/profile')).toBe(true);
    expect(requiresAuth('settings/notifications')).toBe(true);
  });

  it('returns false for public paths', () => {
    expect(requiresAuth('byte/123')).toBe(false);
    expect(requiresAuth('profile/ismail')).toBe(false);
    expect(requiresAuth('teret/design')).toBe(false);
    expect(requiresAuth('hub/technology')).toBe(false);
    expect(requiresAuth('search')).toBe(false);
    expect(requiresAuth('home')).toBe(false);
    expect(requiresAuth('')).toBe(false);
  });
});

describe('deepLinkRequiresAuth', () => {
  it('returns true for auth-required URLs', () => {
    expect(deepLinkRequiresAuth('fomio://me')).toBe(true);
    expect(deepLinkRequiresAuth('fomio://notifications')).toBe(true);
    expect(deepLinkRequiresAuth('fomio://compose')).toBe(true);
    expect(deepLinkRequiresAuth('fomio://settings')).toBe(true);
  });

  it('returns false for public URLs', () => {
    expect(deepLinkRequiresAuth('fomio://byte/123')).toBe(false);
    expect(deepLinkRequiresAuth('fomio://profile/ismail')).toBe(false);
    expect(deepLinkRequiresAuth('fomio://search')).toBe(false);
  });

  it('returns false for non-fomio URLs', () => {
    expect(deepLinkRequiresAuth('https://example.com')).toBe(false);
  });
});

describe('resolveDeepLink result properties', () => {
  it('includes effectivePath in result', () => {
    const result = resolveDeepLink('fomio://byte/123');
    expect(result?.effectivePath).toBe('byte/123');
  });

  it('includes requiresAuth in result for protected routes', () => {
    const result = resolveDeepLink('fomio://compose');
    expect(result?.requiresAuth).toBe(true);
  });

  it('includes requiresAuth=false for public routes', () => {
    const result = resolveDeepLink('fomio://byte/123');
    expect(result?.requiresAuth).toBe(false);
  });
});

describe('intent replay integration', () => {
  it('compose route is marked as requiring auth', () => {
    const result = resolveDeepLink('fomio://compose');
    expect(result?.requiresAuth).toBe(true);
    expect(result?.effectivePath).toBe('compose');
  });

  it('compose with teret param is marked as requiring auth', () => {
    const result = resolveDeepLink('fomio://compose?teret=design');
    expect(result?.requiresAuth).toBe(true);
  });

  it('notifications route is marked as requiring auth', () => {
    const result = resolveDeepLink('fomio://notifications');
    expect(result?.requiresAuth).toBe(true);
  });

  it('settings routes are marked as requiring auth', () => {
    expect(resolveDeepLink('fomio://settings')?.requiresAuth).toBe(true);
    expect(resolveDeepLink('fomio://settings/profile')?.requiresAuth).toBe(true);
    expect(resolveDeepLink('fomio://settings/notifications')?.requiresAuth).toBe(true);
  });

  it('me route is marked as requiring auth', () => {
    const result = resolveDeepLink('fomio://me');
    expect(result?.requiresAuth).toBe(true);
  });

  it('public routes do not require auth', () => {
    expect(resolveDeepLink('fomio://byte/123')?.requiresAuth).toBe(false);
    expect(resolveDeepLink('fomio://profile/john')?.requiresAuth).toBe(false);
    expect(resolveDeepLink('fomio://teret/design')?.requiresAuth).toBe(false);
    expect(resolveDeepLink('fomio://search')?.requiresAuth).toBe(false);
    expect(resolveDeepLink('fomio://home')?.requiresAuth).toBe(false);
  });
});

