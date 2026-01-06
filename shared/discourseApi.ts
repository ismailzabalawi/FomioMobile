// Import Constants for Expo config
import Constants from 'expo-constants';
import { authHeaders } from '../lib/auth';
const config = Constants.expoConfig?.extra || {};

// Environment-aware storage import
let AsyncStorage: any;

// Check if we're in a Node.js environment
const isNode = typeof window === 'undefined';

if (isNode) {
  // Node.js environment - use mock storage
  AsyncStorage = {
    getItem: async (key: string) => null,
    setItem: async (key: string, value: string) => {},
    removeItem: async (key: string) => {},
  };
} else {
  // React Native environment - use real AsyncStorage
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch (error) {
    // Fallback if AsyncStorage is not available
    AsyncStorage = {
      getItem: async (key: string) => null,
      setItem: async (key: string, value: string) => {},
      removeItem: async (key: string) => {},
    };
  }
}

// Security configuration
const SECURITY_CONFIG = {
  HTTPS_ONLY: process.env.EXPO_PUBLIC_ENABLE_HTTPS_ONLY === 'true',
  RATE_LIMITING: process.env.EXPO_PUBLIC_ENABLE_RATE_LIMITING === 'true',
  DEBUG_MODE: process.env.EXPO_PUBLIC_ENABLE_DEBUG_MODE === 'true',
  MOCK_DATA: process.env.EXPO_PUBLIC_ENABLE_MOCK_DATA === 'true',
};

// Flag to track if auth is in progress (prevents clearing API keys on 401/403 during auth flow)
let isAuthInProgress = false;

/**
 * Set the auth-in-progress flag
 * Call this with true when starting auth flow, false when complete
 * Prevents race condition where 401/403 from parallel requests clears the API key being stored
 */
export function setAuthInProgress(inProgress: boolean): void {
  isAuthInProgress = inProgress;
  console.log(`🔐 Auth in progress flag set to: ${inProgress}`);
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,
  RETRY_DELAY_MS: 1000,
  MAX_RETRIES: 3,
};

// Input validation patterns
const VALIDATION_PATTERNS = {
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  TOKEN: /^[a-zA-Z0-9._-]+$/,
};

// Discourse API Configuration
export interface DiscourseConfig {
  baseUrl: string;
}

// Simplified App Entity Types (Hubs → Bytes → Comments)
export interface Hub {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  textColor: string;
  icon?: string;
  parentId?: number;
  topicsCount: number;
  postsCount: number;
  isSubscribed: boolean;
  // Mapped from Discourse Category
  discourseId: number;
}

export interface Byte {
  id: number;
  title: string;
  excerpt?: string;
  content: string;
  rawContent?: string;
  hubId: number;
  hubName: string;
  author: AppUser;
  category: {
    id: number;
    name: string;
    color: string;
  };
  commentCount: number;
  replyCount: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  isLocked: boolean;
  isLiked: boolean;
  isBookmarked?: boolean;
  likeCount: number;
  viewCount: number;
  tags: string[];
  // Mapped from Discourse Topic
  discourseId: number;
}

export interface Comment {
  id: number;
  content: string;
  rawContent: string;
  author: AppUser;
  byteId: number;
  byteTitle: string;
  postNumber: number;
  replyToPostNumber?: number;
  replyToId?: number;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  isLiked: boolean;
  // Mapped from Discourse Post
  discourseId: number;
}

export interface AppUser {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  bytes: number;
  comments: number;
  joinedDate: string;
}

// User Profile Types
export interface DiscourseUser {
  id: number;
  username: string;
  name?: string;
  email?: string;
  avatar_template: string;
  profile_background?: string;
  card_background?: string;
  bio_raw?: string;
  location?: string;
  website?: string;
  date_of_birth?: string;
  trust_level: number;
  badge_count: number;
  post_count: number;
  topic_count: number;
  likes_given: number;
  likes_received: number;
  time_read: number;
  days_visited: number;
  last_seen_at: string;
  created_at: string;
  can_edit: boolean;
  can_edit_username: boolean;
  can_edit_email: boolean;
  can_edit_name: boolean;
}

// Settings Types
export interface UserSettings {
  email_digests: boolean;
  email_level: number;
  email_messages_level: number;
  mailing_list_mode: boolean;
  email_previous_replies: number;
  email_in_reply_to: boolean;
  include_tl0_in_digests: boolean;
  automatically_unpin_topics: boolean;
  push_notifications: boolean;
  push_notifications_alert: boolean;
  push_notifications_sound: boolean;
  theme_ids: number[];
  dark_scheme_id?: number;
  text_size: string;
  title_count_mode: string;
  timezone: string;
  skip_new_user_tips: boolean;
  hide_profile_and_presence: boolean;
  allow_private_messages: boolean;
  external_links_in_new_tab: boolean;
  dynamic_favicon: boolean;
  enable_quoting: boolean;
  enable_defer: boolean;
  digest_after_minutes: number;
  new_topic_duration_minutes: number;
  auto_track_topics_after_msecs: number;
  notification_level_when_replying: number;
  like_notification_frequency: number;
}

// Notification Preferences Frequency Mapping
// Maps between Fomio local format and Discourse API format
export const LOCAL_TO_DISCOURSE_FREQUENCY = {
  always: 0,
  daily: 1,
  weekly: 2,
  never: 3,
} as const;

export const DISCOURSE_TO_LOCAL_FREQUENCY: Record<number, 'always' | 'daily' | 'weekly' | 'never'> = {
  0: 'always',
  1: 'daily',
  2: 'weekly',
  3: 'never',
};

// API Response Types
export interface DiscourseApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  status?: number; // HTTP status code for error handling
}

export interface LoginResponse {
  user: DiscourseUser;
  token: string;
  refresh_token?: string;
}

export interface SearchResult {
  bytes: Byte[];
  comments: Comment[];
  users: AppUser[];
  hubs: Hub[];
  totalResults: number;
}

// Security validation functions
class SecurityValidator {
  static validateUrl(url: string): boolean {
    if (!url) return false;
    if (SECURITY_CONFIG.HTTPS_ONLY && !url.startsWith('https://')) {
      throw new Error('HTTPS is required for security');
    }
    return VALIDATION_PATTERNS.URL.test(url);
  }

  static validateUsername(username: string): boolean {
    if (!username) return false;
    return VALIDATION_PATTERNS.USERNAME.test(username);
  }

  static validateEmail(email: string): boolean {
    if (!email) return false;
    return VALIDATION_PATTERNS.EMAIL.test(email);
  }

  static validateToken(token: string): boolean {
    if (!token) return false;
    return VALIDATION_PATTERNS.TOKEN.test(token);
  }

  static sanitizeInput(input: string): string {
    if (!input) return '';
    // Remove potentially dangerous characters
    return input.replace(/[<>\"'&]/g, '');
  }

  static validateConfig(config: DiscourseConfig): void {
    if (!config.baseUrl) {
      throw new Error('Base URL is required');
    }
    
    if (!this.validateUrl(config.baseUrl)) {
      throw new Error('Invalid base URL format');
    }
  }
}

// Rate limiting implementation
class RateLimiter {
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  canMakeRequest(endpoint: string): boolean {
    if (!SECURITY_CONFIG.RATE_LIMITING) return true;

    const now = Date.now();
    const key = endpoint.split('?')[0]; // Remove query params for rate limiting
    const record = this.requestCounts.get(key);

    if (!record || now > record.resetTime) {
      this.requestCounts.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute window
      return true;
    }

    if (record.count >= RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }

    record.count++;
    return true;
  }

  async waitForRateLimit(): Promise<void> {
    if (!SECURITY_CONFIG.RATE_LIMITING) return;
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.RETRY_DELAY_MS));
  }
}

class DiscourseApiService {
  private config: DiscourseConfig;
  private rateLimiter: RateLimiter = new RateLimiter();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(config: DiscourseConfig) {
    // Validate configuration before setting
    SecurityValidator.validateConfig(config);
    this.config = config;
  }

  // Enhanced HTTP Request Helper with security, timeout, retry logic, and caching
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 3
  ): Promise<DiscourseApiResponse<T>> {
    try {
      // Rate limiting check
      if (!this.rateLimiter.canMakeRequest(endpoint)) {
        await this.rateLimiter.waitForRateLimit();
        return this.makeRequest<T>(endpoint, options, retries);
      }

      // Validate endpoint
      if (!endpoint || endpoint.includes('..')) {
        throw new Error('Invalid endpoint');
      }

      const url = `${this.config.baseUrl}${endpoint}`;
      const timeout = 10000; // 10 second timeout
      const method = options.method || 'GET';
      
      // Check cache for GET requests
      if (this.isCacheableRequest(method, endpoint)) {
        const cacheKey = await this.getCacheKey(endpoint, options);
        const cachedData = this.getCachedData<T>(cacheKey, endpoint);
        if (cachedData) {
          return {
            success: true,
            data: cachedData,
          };
        }
      }
      
      const attemptNumber = (3 - retries) + 1;
      console.log(`🌐 Making request to: ${url} (attempt ${attemptNumber}/3)`);
      
      // Security headers
      // Don't set Content-Type for FormData - let the browser/React Native set it with boundary
      const isFormData = options.body instanceof FormData;
      const headers: Record<string, string> = {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Fomio/1.0',
        ...(options.headers as Record<string, string> | undefined),
      };
      
      // Only set Content-Type for non-FormData requests
      if (!isFormData && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      // Authentication: Use User API Keys (delegated auth with RSA)
      const mergeAuthHeaders = (authHeadersData: Record<string, string>) => {
        const {
          'Content-Type': authContentType,
          'content-type': authContentTypeLower,
          ...rest
        } = authHeadersData;
        Object.assign(headers, rest);
        if (!headers['Content-Type'] && !headers['content-type']) {
          const contentType = authContentType || authContentTypeLower;
          if (contentType) {
            headers['Content-Type'] = contentType;
          }
        }
      };

      try {
        const authHeadersData = await authHeaders();
        
        if (authHeadersData['User-Api-Key']) {
          mergeAuthHeaders(authHeadersData);
          
          // Log authentication status for debugging
          const hasApiKey = !!authHeadersData['User-Api-Key'];
          const hasUsername = !!authHeadersData['Api-Username'];
          const isWriteOperation = method !== 'GET' && method !== 'HEAD';
          
          if (isWriteOperation && !hasUsername) {
            console.error('❌ Write operation without Api-Username header - request will fail with CSRF error', {
              method,
              endpoint,
            });
            // Return early to prevent CSRF error
            return {
              success: false,
              error: 'Authentication incomplete. Please sign in again.',
              status: 403,
            };
          }
          
          console.log('🔑 Using User API Key for authentication', {
            hasApiKey,
            hasUsername,
            username: authHeadersData['Api-Username'] || 'not set',
            method,
          });
        } else {
          // For write operations without API key, try refreshing credentials once (handles race conditions)
          const isWriteOperation = method !== 'GET' && method !== 'HEAD';
          if (isWriteOperation) {
            // Small delay to handle race conditions where key was just stored
            // Increased to 200ms to give SecureStore more time to flush
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Try getting auth headers again
            try {
              const retryHeaders = await authHeaders();
              if (retryHeaders['User-Api-Key']) {
                mergeAuthHeaders(retryHeaders);
                console.log('🔑 API key found on retry');
              } else {
                console.error('❌ Write operation without API key - request will fail', {
                  method,
                  endpoint,
                });
                return {
                  success: false,
                  error: 'Authentication required. Please sign in to perform this action.',
                  status: 401,
                };
              }
            } catch (retryError) {
              console.error('❌ Write operation without API key - request will fail', {
                method,
                endpoint,
              });
              return {
                success: false,
                error: 'Authentication required. Please sign in to perform this action.',
                status: 401,
              };
            }
          } else {
            console.log('⚠️ User API Key not found, request may fail');
          }
        }
      } catch (error) {
        console.warn('Failed to load auth headers', error);
      }

      // Sanitize request body only for JSON payloads
      let sanitizedBody = options.body;
      const contentTypeHeader = headers['Content-Type'] || headers['content-type'] || '';
      const isJsonBody =
        typeof options.body === 'string' && contentTypeHeader.includes('application/json');
      if (isJsonBody && typeof options.body === 'string') {
        try {
          const parsed = JSON.parse(options.body);
          const sanitized = this.sanitizeObject(parsed);
          sanitizedBody = JSON.stringify(sanitized);
        } catch (error) {
          throw new Error('Invalid request body format');
        }
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          body: sanitizedBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`📡 Response status: ${response.status} ${response.statusText}`);

        // Handle HTTP errors securely
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // 404 on /session/current.json is expected when user is not authenticated
          // Don't log it as an error - it's normal behavior
          const isSessionCheck = endpoint === '/session/current.json' && response.status === 404;
          const isAdminUserEndpoint = endpoint.includes('/admin/users/') && response.status === 404;
          
          // Handle 500 OR 404 errors on drafts endpoint - Discourse may return either when draft doesn't exist
          // Treat this as "no draft exists" rather than an error
          const isDraftEndpoint = endpoint.includes('/drafts/') && (response.status === 500 || response.status === 404);
          
          // Handle 404 on resource lookups - these are expected when resource doesn't exist
          // Topics, posts, users, categories can legitimately not exist
          const isResourceLookup404 = response.status === 404 && (
            endpoint.match(/^\/t\/\d+/) ||           // Topic lookup /t/{id}
            endpoint.match(/^\/posts\/\d+/) ||       // Post lookup /posts/{id}
            endpoint.match(/^\/u\/[^/]+\.json/) ||   // User lookup /u/{username}.json
            endpoint.includes('/c/') ||               // Category lookup
            endpoint.includes('/notifications')       // Notifications (can be empty)
          );
          
          if (isSessionCheck) {
            console.log('📱 No active session (user not authenticated)');
          } else if (isAdminUserEndpoint) {
            // Admin endpoint requires admin access - 404 is expected for non-admin users
            // Silently handle this - the caller will use fallback user data
            console.debug(`⚠️ Admin endpoint not accessible (expected for non-admin): ${endpoint}`);
          } else if (isDraftEndpoint) {
            // Draft doesn't exist - return empty draft response instead of error
            console.log('📝 Draft not found (treated as empty draft)');
            return {
              success: true,
              data: { draft: null, draft_key: null, sequence: 0 } as T,
              status: 200,
            };
          } else if (isResourceLookup404) {
            // Resource not found is a valid response, not an error
            console.log(`📭 Resource not found (404): ${endpoint}`);
          } else {
            console.error(`❌ HTTP Error ${response.status}:`, errorData);
          }
          
          // Handle 401/403 (unauthorized/forbidden) - API key expired or invalid
          if (response.status === 401 || response.status === 403) {
            const isCsrfError = errorData.errors?.some((err: string) => 
              typeof err === 'string' && err.includes('CSRF')
            ) || errorData.message?.includes('CSRF');
            
            // Check if this is a permissions error (invalid_access) vs invalid key
            // This includes "not permitted", "permission denied", etc.
            const isPermissionError = errorData.error_type === 'invalid_access' || 
                                    errorData.errors?.some((err: string) => 
                                      typeof err === 'string' && (
                                        err.includes('not permitted') || 
                                        err.includes('permission') ||
                                        err.includes('invalid_access') ||
                                        err.includes('You cannot') ||
                                        err.includes('forbidden')
                                      )
                                    );
            
            // Don't clear keys for permission errors - these mean the API key is VALID
            // but the user doesn't have permission for this specific action
            // Only clear keys for actual authentication failures (401 or 403 without permission message)
            const isAuthFailure = response.status === 401;
            const shouldClearKeys = !isCsrfError && !isPermissionError && isAuthFailure;
            
            if (isCsrfError) {
              // CSRF error usually means API key authentication failed
              // This can happen if:
              // 1. API key is missing
              // 2. Api-Username header is missing (required for write operations)
              // 3. API key doesn't have write permissions
              console.error('🔒 CSRF error (403) - API key authentication issue', {
                endpoint,
                method: options.method || 'GET',
                hasApiKey: !!headers['User-Api-Key'],
                hasUsername: !!headers['Api-Username'],
              });
            } else if (isPermissionError) {
              // Permission error - API key is valid but user lacks permissions for this action
              console.warn('⚠️ Permission error (403) - API key valid but lacks permissions for this action', {
                endpoint,
                method: options.method || 'GET',
                errorType: errorData.error_type,
                errorMessage: errorData.errors?.[0]?.substring(0, 100),
              });
            } else if (isAuthFailure) {
              console.log('🔒 API key expired or invalid (401), clearing authentication');
            } else {
              console.warn('⚠️ 403 without clear permission message - treating as auth failure', {
                endpoint,
                errorData,
              });
            }
            
            // Clear User API Key only if it's a real authentication failure (not CSRF or permission error on GET)
            // Also don't clear if auth is currently in progress (to prevent race condition)
            if (shouldClearKeys && !isAuthInProgress) {
              try {
                const UserApiKeyManager = require('./userApiKeyManager').UserApiKeyManager;
                await UserApiKeyManager.clearApiKey();
                console.log('🔑 User API Key cleared due to 401/403');
              } catch (error) {
                console.warn('Failed to clear User API Key', error);
              }
            } else if (shouldClearKeys && isAuthInProgress) {
              console.log('⚠️ Got 401/403 but auth is in progress, not clearing API key');
            }
            
            return {
              success: false,
              error: isCsrfError 
                ? 'Authentication failed. Please sign in again to perform this action.'
                : 'Authorization expired. Please authorize the app again.',
              errors: errorData.errors,
              status: response.status, // Include status for error handling
            };
          }
          
          // Handle 404 for session check as expected (not an error)
          if (isSessionCheck) {
            return {
              success: false,
              error: 'No active session',
              status: 404,
            };
          }
          
          // Handle 429 (Rate Limiting) - retry with exponential backoff
          if (response.status === 429 && retries > 0) {
            const retryAfter = response.headers.get('Retry-After');
            const delayMs = retryAfter 
              ? parseInt(retryAfter, 10) * 1000 
              : Math.min(60000, 1000 * Math.pow(2, 4 - retries)); // Exponential backoff, max 60s
            
            console.warn(`⏳ Rate limited (429). Retrying after ${delayMs}ms (${retries} retries left)`);
            await this.delay(delayMs);
            return this.makeRequest<T>(endpoint, options, retries - 1);
          }
          
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : null;
            return {
              success: false,
              error: retrySeconds
                ? `Rate limited. Please try again in ${retrySeconds}s.`
                : 'Rate limited. Please try again shortly.',
              errors: errorData.errors,
              status: response.status,
            };
          }
          
          // Retry on 5xx errors (server errors)
          if (response.status >= 500 && retries > 0) {
            console.log(`🔄 Retrying due to server error (${response.status})`);
            await this.delay(1000 * (4 - retries)); // Exponential backoff
            return this.makeRequest<T>(endpoint, options, retries - 1);
          }
          
          return {
            success: false,
            error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            errors: errorData.errors,
            status: response.status, // Include status for error handling
          };
        }

        // Check if response has content before parsing JSON
        // Read response as text first (can only be read once)
        const text = await response.text();
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        
        let data: any;
        if (text.trim().length === 0) {
          // Empty response - return empty object for successful requests
          console.log('⚠️ Empty response body, returning empty object');
          data = {};
        } else if (isJson) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.error('❌ JSON parse error:', parseError, 'Response text:', text.substring(0, 200));
            throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          }
        } else {
          // Non-JSON response - return as text wrapped in object
          console.log('⚠️ Non-JSON response, Content-Type:', contentType);
          data = { raw: text };
        }
        console.log('✅ Request successful');

        // Cache successful GET requests
        if (this.isCacheableRequest(method, endpoint)) {
          const cacheKey = await this.getCacheKey(endpoint, options);
          this.setCachedData(cacheKey, data);
        }

        return {
          success: true,
          data,
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Handle timeout and network errors
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            console.error('⏰ Request timeout');
            if (retries > 0) {
              console.log('🔄 Retrying due to timeout');
              await this.delay(1000 * (4 - retries));
              return this.makeRequest<T>(endpoint, options, retries - 1);
            }
            return {
              success: false,
              error: 'Request timeout - please check your connection and try again',
            };
          }
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('🚨 Network error:', error);
      
      // Retry on network errors if retries remaining
      if (retries > 0 && this.isRetryableError(error)) {
        console.log('🔄 Retrying due to network error');
        await this.delay(1000 * (4 - retries));
        return this.makeRequest<T>(endpoint, options, retries - 1);
      }
      
      // Don't expose internal errors in production
      const errorMessage = SECURITY_CONFIG.DEBUG_MODE 
        ? (error instanceof Error ? error.message : 'Network error')
        : 'Network error - please check your connection and try again';
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Helper method to determine if an error is retryable
  private isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      const retryableErrors = [
        'Network request failed',
        'fetch',
        'timeout',
        'ECONNRESET',
        'ENOTFOUND',
        'ETIMEDOUT',
      ];
      return retryableErrors.some(retryableError => 
        error.message.includes(retryableError)
      );
    }
    return false;
  }

  // Helper method for delays
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cache management methods
  private async getCacheKey(endpoint: string, options: RequestInit = {}): Promise<string> {
    const bodyHash = options.body ? btoa(String(options.body)).slice(0, 8) : '';
    // Check if User API Key exists for cache key differentiation
    try {
      const UserApiKeyManager = require('./userApiKeyManager').UserApiKeyManager;
      const hasApiKey = await UserApiKeyManager.hasApiKey();
      return `${endpoint}_${bodyHash}_${hasApiKey ? 'auth' : 'public'}`;
    } catch {
      return `${endpoint}_${bodyHash}_public`;
    }
  }

  private getCachedData<T>(cacheKey: string, endpoint?: string): T | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    // Use endpoint-specific cache duration if available
    const cacheDuration = endpoint ? this.getCacheDuration(endpoint) : this.CACHE_DURATION;
    const age = Date.now() - cached.timestamp;
    
    if (age < cacheDuration) {
      console.log(`📦 Using cached data for: ${cacheKey} (age: ${Math.round(age / 1000)}s)`);
      return cached.data as T;
    }
    
    return null;
  }

  private setCachedData<T>(cacheKey: string, data: T): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    console.log(`💾 Cached data for: ${cacheKey}`);
  }



  private isCacheableRequest(method: string, endpoint: string): boolean {
    // Only cache GET requests
    if (method !== 'GET') return false;
    
    // Cache patterns for various endpoints
    const cacheablePatterns = [
      // Existing endpoints
      '/categories.json',
      '/site.json',
      '/session/current.json',
      '/notifications.json',
      
      // Feed endpoints
      '/latest.json',
      
      // Topic endpoints (using regex patterns stored as strings)
      '/t/',        // Topic details
      '/c/',        // Category feeds
      
      // User endpoints
      '/u/',        // User profiles
      '/users/',    // User data
      '/topics/created-by/', // User topics
      '/user_actions.json',  // User activity
      
      // Search endpoints
      '/search.json',
    ];
    
    return cacheablePatterns.some(pattern => endpoint.includes(pattern));
  }

  /**
   * Get cache duration based on endpoint type
   * Different endpoints have different staleness requirements
   */
  private getCacheDuration(endpoint: string): number {
    // Long cache for stable data
    if (endpoint.includes('/categories.json') || 
        endpoint.includes('/site.json')) {
      return 30 * 60 * 1000; // 30 minutes
    }
    
    // Medium cache for user data
    if (endpoint.includes('/u/') || 
        endpoint.includes('/users/') ||
        endpoint.includes('/session/current.json')) {
      return 10 * 60 * 1000; // 10 minutes
    }
    
    // Short cache for dynamic content
    if (endpoint.includes('/latest.json') || 
        endpoint.includes('/notifications.json') ||
        endpoint.includes('/search.json')) {
      return 2 * 60 * 1000; // 2 minutes
    }
    
    // Default cache duration
    return this.CACHE_DURATION;
  }

  // Sanitize object recursively
  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return SecurityValidator.sanitizeInput(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  }


  async getCurrentUser(): Promise<DiscourseApiResponse<DiscourseUser>> {
    const response = await this.makeRequest<any>('/session/current.json');
    
    // Discourse API can return user data in different structures:
    // - { current_user: {...} }
    // - { user: {...} }
    // - Direct user object
    if (response.success && response.data) {
      // Log the raw response structure for debugging
      console.log('🔍 getCurrentUser raw response structure:', {
        responseKeys: Object.keys(response.data),
        hasCurrentUser: !!response.data.current_user,
        hasUser: !!response.data.user,
        currentUserKeys: response.data.current_user ? Object.keys(response.data.current_user) : [],
        userKeys: response.data.user ? Object.keys(response.data.user) : [],
      });
      
      // Try multiple possible locations for user data
      // Priority: current_user (standard) > user (your API) > direct
      let userData = response.data.current_user 
        || response.data.user 
        || response.data;
      
      // If we got the full response object (has badges/badge_types), extract the user
      // This happens when cached data returns the full response structure
      if (userData && (userData.user_badges || userData.badges || userData.badge_types || userData.users)) {
        // This is the full response object, not the user - extract the user
        // Check user key first (your API structure), then current_user (standard)
        userData = userData.user || userData.current_user || null;
        
        if (userData && (userData.id || userData.username)) {
          console.log('⚠️ getCurrentUser: Detected full response object, extracted user from nested structure', {
            extractedFrom: response.data.user ? 'user' : 'current_user',
            hasUsername: !!userData.username,
            username: userData.username,
            userId: userData.id,
          });
        } else {
          // Clear cache if we detect wrong structure to force fresh fetch next time
          try {
            const cacheKey = await this.getCacheKey('/session/current.json', {});
            this.cache.delete(cacheKey);
            console.log('🗑️ getCurrentUser: Cleared invalid cache entry, will fetch fresh data next time');
          } catch (e) {
            // Ignore cache clear errors
          }
          
          console.error('❌ getCurrentUser: Full response object detected but no valid user found', {
            responseKeys: Object.keys(response.data),
            userDataKeys: userData ? Object.keys(userData) : [],
            hasUser: !!response.data.user,
            hasCurrentUser: !!response.data.current_user,
          });
          userData = null;
        }
      }
      
      // Validate that we actually got user data (should have id and username)
      if (!userData || (!userData.id && !userData.username)) {
        console.error('❌ getCurrentUser: Invalid user data structure', {
          hasCurrentUser: !!response.data.current_user,
          hasUser: !!response.data.user,
          responseKeys: Object.keys(response.data),
          userDataKeys: userData ? Object.keys(userData) : [],
          userData: userData,
        });
        return {
          success: false,
          error: 'Invalid user data structure in API response',
        };
      }
      
      // Debug logging to understand the response structure
      console.log('🔍 getCurrentUser extracted user:', {
        hasId: !!userData.id,
        id: userData.id,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        avatar_template: userData.avatar_template,
        extractedFrom: response.data.current_user ? 'current_user' : (response.data.user ? 'user' : 'direct'),
        userDataKeys: Object.keys(userData),
      });
      
      // Return the extracted user data
      return {
        success: true,
        data: userData as DiscourseUser,
      };
    }
    
    console.log('🔍 getCurrentUser failed:', response.error);
    return response;
  }

  // User Profile API with input validation
  async getUserProfile(username: string): Promise<DiscourseApiResponse<DiscourseUser>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    
    const response = await this.makeRequest<any>(`/users/${encodeURIComponent(username)}.json`);
    
    // Discourse API can return user data in different structures
    if (response.success && response.data) {
      // Log the raw response structure for debugging
      console.log('🔍 getUserProfile raw response structure:', {
        responseKeys: Object.keys(response.data),
        hasUser: !!response.data.user,
        hasCurrentUser: !!response.data.current_user,
        userKeys: response.data.user ? Object.keys(response.data.user) : [],
      });
      
      // Try multiple possible locations for user data
      let userData = response.data.user 
        || response.data.current_user 
        || response.data;
      
      // If we got the full response object, try to find the user within it
      if (userData && (userData.user_badges || userData.badges || userData.badge_types || userData.users)) {
        // This is the full response object, not the user - extract the user
        const fullResponse = userData;
        const extractedUser = fullResponse.user || fullResponse.current_user || null;
        
        if (extractedUser && (extractedUser.id || extractedUser.username)) {
          userData = extractedUser;
          console.log('⚠️ getUserProfile: Detected full response object, extracted user from nested structure', {
            extractedFrom: fullResponse.user ? 'user' : 'current_user',
            hasUsername: !!userData.username,
            username: userData.username,
            userId: userData.id,
          });
        } else {
          // Clear cache if we detect wrong structure
          try {
            const cacheKey = await this.getCacheKey(`/users/${encodeURIComponent(username)}.json`, {});
            this.cache.delete(cacheKey);
            console.log('🗑️ getUserProfile: Cleared invalid cache entry');
          } catch (e) {
            // Ignore cache clear errors
          }
          
          console.error('❌ getUserProfile: Full response object detected but no valid user found', {
            responseKeys: Object.keys(response.data),
            fullResponseKeys: fullResponse ? Object.keys(fullResponse) : [],
            hasUser: !!fullResponse?.user,
            hasCurrentUser: !!fullResponse?.current_user,
          });
          userData = null;
        }
      }
      
      // Validate that we actually got user data
      if (!userData || (!userData.id && !userData.username)) {
        console.error('❌ getUserProfile: Invalid user data structure', {
          hasUser: !!response.data.user,
          hasCurrentUser: !!response.data.current_user,
          responseKeys: Object.keys(response.data),
          userDataKeys: userData ? Object.keys(userData) : [],
        });
        return {
          success: false,
          error: 'Invalid user data structure in API response',
        };
      }
      
      // Debug logging
      console.log('🔍 getUserProfile extracted user:', {
        hasId: !!userData.id,
        id: userData.id,
        username: userData.username,
        name: userData.name,
        extractedFrom: response.data.user ? 'user' : (response.data.current_user ? 'current_user' : 'direct'),
      });
      
      // Hoist profile/card backgrounds if available (Discourse nests under user_profile)
      const userProfile =
        response.data.user?.user_profile ||
        response.data.current_user?.user_profile ||
        null;

      if (userProfile) {
        userData = {
          ...userData,
          profile_background: userProfile.profile_background || userData.profile_background,
          card_background: userProfile.card_background || userData.card_background,
        };
      }
      
      return {
        success: true,
        data: userData as DiscourseUser,
      };
    }
    
    return response;
  }

  async updateUserProfile(
    username: string,
    updates: Partial<DiscourseUser>
  ): Promise<DiscourseApiResponse<DiscourseUser>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    
    // Sanitize updates
    const sanitizedUpdates = this.sanitizeObject(updates);
    
    // Discourse API requires .json suffix for user profile updates
    // Endpoint: PUT /users/{username}.json
    return this.makeRequest<DiscourseUser>(`/users/${encodeURIComponent(username)}.json`, {
      method: 'PUT',
      body: JSON.stringify(sanitizedUpdates),
    });
  }

  async uploadAvatar(username: string, imageFile: File | { uri: string; type?: string; name?: string; fileSize?: number }): Promise<DiscourseApiResponse<any>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }

    // Handle React Native file format (from expo-image-picker)
    let fileType: string;
    let fileSize: number | undefined;
    
    if ('uri' in imageFile) {
      // React Native format
      fileType = imageFile.type || 'image/jpeg';
      fileSize = imageFile.fileSize;
    } else {
      // Browser File format
      fileType = imageFile.type;
      fileSize = imageFile.size;
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!allowedTypes.some(type => fileType.includes(type))) {
      return { success: false, error: 'Invalid file type. Only JPEG, PNG, and GIF are allowed.' };
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileSize && fileSize > maxSize) {
      return { success: false, error: 'File too large. Maximum size is 5MB.' };
    }

    try {
      // Step 1: Upload the image to /uploads.json
      const uploadFormData = new FormData();
      
      if ('uri' in imageFile) {
        // React Native: append as object with uri, type, name
        uploadFormData.append('file', {
          uri: imageFile.uri,
          type: fileType,
          name: imageFile.name || 'avatar.jpg',
        } as any);
      } else {
        // Browser: append File object directly
        uploadFormData.append('file', imageFile);
      }
      
      uploadFormData.append('type', 'avatar');
      
      // Get user ID for the upload
      const userResponse = await this.getUserProfile(username);
      if (!userResponse.success || !userResponse.data) {
        console.error('❌ uploadAvatar: Failed to get user information', {
          success: userResponse.success,
          error: userResponse.error,
          hasData: !!userResponse.data,
        });
        return { success: false, error: 'Failed to get user information' };
      }
      
      const userId = userResponse.data.id;
      if (!userId) {
        console.error('❌ uploadAvatar: User ID is missing', {
          hasData: !!userResponse.data,
          dataKeys: userResponse.data ? Object.keys(userResponse.data) : [],
          username: userResponse.data.username,
        });
        return { success: false, error: 'User ID is missing from user data' };
      }
      
      uploadFormData.append('user_id', userId.toString());

      console.log('📤 Step 1: Uploading avatar image to /uploads.json');
      const uploadResponse = await this.makeRequest<any>('/uploads.json', {
        method: 'POST',
        body: uploadFormData,
        headers: {
          // Don't set Content-Type for FormData, let React Native/browser set it
        },
      });

      if (!uploadResponse.success || !uploadResponse.data) {
        console.error('❌ Avatar upload failed:', uploadResponse.error);
        return { 
          success: false, 
          error: uploadResponse.error || 'Failed to upload avatar image' 
        };
      }

      const uploadId = uploadResponse.data.id || uploadResponse.data.upload_id;
      if (!uploadId) {
        console.error('❌ No upload_id returned from upload:', uploadResponse.data);
        return { 
          success: false, 
          error: 'Upload succeeded but no upload ID returned' 
        };
      }

      console.log('✅ Step 1 complete, upload_id:', uploadId);

      // Step 2: Set the uploaded image as the avatar
      console.log('📤 Step 2: Setting uploaded image as avatar');
      const pickResponse = await this.makeRequest<any>(`/u/${encodeURIComponent(username)}/preferences/avatar/pick.json`, {
        method: 'PUT',
        body: JSON.stringify({
          upload_id: uploadId,
          type: 'uploaded',
        }),
      });

      if (!pickResponse.success) {
        console.error('❌ Failed to set avatar:', pickResponse.error);
        return { 
          success: false, 
          error: pickResponse.error || 'Failed to set uploaded image as avatar' 
        };
      }

      console.log('✅ Avatar upload and set complete');
      return {
        success: true,
        data: pickResponse.data,
      };
    } catch (error) {
      console.error('❌ Avatar upload exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during avatar upload',
      };
    }
  }

  // Upload profile/hero background image
  async uploadProfileHeader(
    username: string,
    imageFile: { uri: string; type?: string; name?: string; fileSize?: number }
  ): Promise<DiscourseApiResponse<any>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }

    // Validate file type and size (reuse avatar constraints)
    const fileType = imageFile.type || 'image/jpeg';
    const fileSize = imageFile.fileSize;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!allowedTypes.some(type => fileType.includes(type))) {
      return { success: false, error: 'Invalid file type. Only JPEG, PNG, and GIF are allowed.' };
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileSize && fileSize > maxSize) {
      return { success: false, error: 'File too large. Maximum size is 5MB.' };
    }

    try {
      // Step 1: Upload the image
      const uploadFormData = new FormData();
      uploadFormData.append('file', {
        uri: imageFile.uri,
        type: fileType,
        name: imageFile.name || 'profile-header.jpg',
      } as any);
      uploadFormData.append('type', 'profile_background');

      // Get user ID for the upload
      const userResponse = await this.getUserProfile(username);
      if (!userResponse.success || !userResponse.data?.id) {
        return { success: false, error: 'Failed to get user information' };
      }
      uploadFormData.append('user_id', userResponse.data.id.toString());

      const uploadResponse = await this.makeRequest<any>('/uploads.json', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.success || !uploadResponse.data) {
        return { success: false, error: uploadResponse.error || 'Failed to upload image' };
      }

      const uploadId = uploadResponse.data.id || uploadResponse.data.upload_id;
      if (!uploadId) {
        return { success: false, error: 'Upload succeeded but no upload ID returned' };
      }

      // Step 2: Set as profile/card background
      const applyResponse = await this.updateUserProfile(username, {
        profile_background_upload_id: uploadId,
        card_background_upload_id: uploadId,
      } as any);

      if (!applyResponse.success) {
        return { success: false, error: applyResponse.error || 'Failed to set profile header' };
      }

      return { success: true, data: applyResponse.data };
    } catch (error) {
      console.error('❌ uploadProfileHeader exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during profile header upload',
      };
    }
  }

  // Upload image for composer/post content
  async uploadImage(imageFile: { uri: string; type?: string; name?: string; fileSize?: number }): Promise<DiscourseApiResponse<{ url: string; id: number }>> {
    // Handle React Native file format (from expo-image-picker)
    let fileType: string;
    let fileSize: number | undefined;
    
    if ('uri' in imageFile) {
      // React Native format
      fileType = imageFile.type || 'image/jpeg';
      fileSize = imageFile.fileSize;
    } else {
      // Browser File format (fallback, though we primarily use React Native)
      fileType = (imageFile as File).type || 'image/jpeg';
      fileSize = (imageFile as File).size;
    }

    // Validate file type and size (same as uploadAvatar)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!allowedTypes.some(type => fileType.includes(type))) {
      return { success: false, error: 'Invalid file type. Only JPEG, PNG, and GIF are allowed.' };
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileSize && fileSize > maxSize) {
      return { success: false, error: 'File too large. Maximum size is 5MB.' };
    }

    const formData = new FormData();
    
    if ('uri' in imageFile) {
      // React Native: append as object with uri, type, name
      formData.append('file', {
        uri: imageFile.uri,
        type: fileType,
        name: imageFile.name || `image.${fileType.split('/')[1] || 'jpg'}`,
      } as any);
    } else {
      // Browser: append File object directly
      formData.append('file', imageFile as File);
    }
    
    // Include type field for composer uploads (most Discourse setups require this)
    formData.append('type', 'composer');

    return this.makeRequest<{ url: string; id: number }>('/uploads.json', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let React Native/browser set it
      },
    });
  }

  // User Settings API
  async getUserSettings(username: string): Promise<DiscourseApiResponse<UserSettings>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    return this.makeRequest<UserSettings>(`/users/${encodeURIComponent(username)}/preferences.json`);
  }

  async updateUserSettings(
    username: string,
    settings: Partial<UserSettings>
  ): Promise<DiscourseApiResponse<UserSettings>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    
    const sanitizedSettings = this.sanitizeObject(settings);
    
    return this.makeRequest<UserSettings>(`/users/${encodeURIComponent(username)}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(sanitizedSettings),
    });
  }

  // Notification Preferences API
  // Get user preferences (like_notification_frequency) from Discourse
  async getUserPreferences(username: string): Promise<DiscourseApiResponse<{ likeFrequency: 'always' | 'daily' | 'weekly' | 'never' }>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }

    try {
      const response = await this.makeRequest<any>(`/u/${encodeURIComponent(username)}.json`);
      
      if (response.success && response.data) {
        const userData = response.data.user || response.data;
        const likeNotificationFrequency = userData?.user_option?.like_notification_frequency;
        
        if (typeof likeNotificationFrequency === 'number' && likeNotificationFrequency >= 0 && likeNotificationFrequency <= 3) {
          return {
            success: true,
            data: {
              likeFrequency: DISCOURSE_TO_LOCAL_FREQUENCY[likeNotificationFrequency] || 'always',
            },
          };
        }
        
        // Default to 'always' if not found or invalid
        return {
          success: true,
          data: {
            likeFrequency: 'always',
          },
        };
      }
      
      return { success: false, error: response.error || 'Failed to load user preferences' };
    } catch (error) {
      console.error('Error loading user preferences from Discourse:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update user preferences (like_notification_frequency) in Discourse
  async updateUserPreferences(
    username: string,
    preferences: { likeFrequency: 'always' | 'daily' | 'weekly' | 'never' }
  ): Promise<DiscourseApiResponse<void>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }

    const discourseFrequency = LOCAL_TO_DISCOURSE_FREQUENCY[preferences.likeFrequency];
    if (discourseFrequency === undefined) {
      return { success: false, error: 'Invalid like frequency value' };
    }

    try {
      return await this.makeRequest<void>(`/u/${encodeURIComponent(username)}.json`, {
        method: 'PUT',
        body: JSON.stringify({
          user: {
            like_notification_frequency: discourseFrequency,
          },
        }),
      });
    } catch (error) {
      console.error('Error updating user preferences in Discourse:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Password Management with enhanced security
  async changePassword(
    username: string,
    currentPassword: string,
    newPassword: string
  ): Promise<DiscourseApiResponse<void>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    if (!currentPassword || !newPassword) {
      return { success: false, error: 'Both current and new passwords are required' };
    }
    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters' };
    }

    return this.makeRequest<void>(`/users/${encodeURIComponent(username)}/preferences/password`, {
      method: 'PUT',
      body: JSON.stringify({
        password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  // Email Management with validation
  async changeEmail(
    username: string,
    newEmail: string
  ): Promise<DiscourseApiResponse<void>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    if (!SecurityValidator.validateEmail(newEmail)) {
      return { success: false, error: 'Invalid email format' };
    }

    return this.makeRequest<void>(`/users/${encodeURIComponent(username)}/preferences/email`, {
      method: 'PUT',
      body: JSON.stringify({
        email: SecurityValidator.sanitizeInput(newEmail),
      }),
    });
  }

  // Notification Preferences
  async updateNotificationSettings(
    username: string,
    settings: Partial<UserSettings>
  ): Promise<DiscourseApiResponse<UserSettings>> {
    return this.updateUserSettings(username, settings);
  }

  // Theme and Appearance
  async getAvailableThemes(): Promise<DiscourseApiResponse<any[]>> {
    return this.makeRequest<any[]>('/admin/themes.json');
  }

  async updateThemePreference(
    username: string,
    themeId: number,
    darkSchemeId?: number
  ): Promise<DiscourseApiResponse<UserSettings>> {
    return this.updateUserSettings(username, {
      theme_ids: [themeId],
      dark_scheme_id: darkSchemeId,
    });
  }

  // Privacy Settings
  async updatePrivacySettings(
    username: string,
    settings: {
      hide_profile_and_presence?: boolean;
      allow_private_messages?: boolean;
    }
  ): Promise<DiscourseApiResponse<UserSettings>> {
    return this.updateUserSettings(username, settings);
  }

  // Account Deletion with confirmation
  async deleteAccount(username: string, password: string): Promise<DiscourseApiResponse<void>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    if (!password) {
      return { success: false, error: 'Password is required for account deletion' };
    }

    return this.makeRequest<void>(`/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
      body: JSON.stringify({
        password: password,
      }),
    });
  }

  // Utility Methods
  getAvatarUrl(avatarTemplate: string, size: number = 120): string {
    if (!avatarTemplate) return '';
    const sanitizedTemplate = SecurityValidator.sanitizeInput(avatarTemplate);
    return `${this.config.baseUrl}${sanitizedTemplate.replace('{size}', size.toString())}`;
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const UserApiKeyManager = require('./userApiKeyManager').UserApiKeyManager;
      return await UserApiKeyManager.hasApiKey();
    } catch {
      return false;
    }
  }

  updateConfig(config: Partial<DiscourseConfig>): void {
    const newConfig = { ...this.config, ...config };
    SecurityValidator.validateConfig(newConfig);
    this.config = newConfig;
  }

  // Security audit method
  async getSecurityStatus(): Promise<{
    httpsEnabled: boolean;
    rateLimitingEnabled: boolean;
    debugMode: boolean;
    mockDataEnabled: boolean;
    isAuthenticated: boolean;
  }> {
    return {
      httpsEnabled: SECURITY_CONFIG.HTTPS_ONLY,
      rateLimitingEnabled: SECURITY_CONFIG.RATE_LIMITING,
      debugMode: SECURITY_CONFIG.DEBUG_MODE,
      mockDataEnabled: SECURITY_CONFIG.MOCK_DATA,
      isAuthenticated: await this.isAuthenticated(),
    };
  }

  // Connectivity check method
  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await this.makeRequest<any>('/site.json');
      return response.success;
    } catch (error) {
      console.error('Connectivity check failed:', error);
      return false;
    }
  }

  // Get API health status
  async getApiHealth(): Promise<{
    isConnected: boolean;
    responseTime: number;
    lastChecked: Date;
  }> {
    const startTime = Date.now();
    const isConnected = await this.checkConnectivity();
    const responseTime = Date.now() - startTime;
    
    return {
      isConnected,
      responseTime,
      lastChecked: new Date(),
    };
  }

  // Cache management public methods
  public clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  getCacheStats(): {
    size: number;
    duration: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      duration: this.CACHE_DURATION,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Force refresh cache for specific endpoint
  async refreshCache(endpoint: string): Promise<void> {
    const cacheKey = await this.getCacheKey(endpoint);
    this.cache.delete(cacheKey);
    console.log(`🔄 Cache refreshed for: ${endpoint}`);
  }

  // Feed and Topics
  async getTopics(queryParams: string = ''): Promise<DiscourseApiResponse<any>> {
    const endpoint = `/latest.json${queryParams ? `?${queryParams}` : ''}`;
    return this.makeRequest<any>(endpoint);
  }

  async getCategoryTopics(categorySlug: string, queryParams: string = ''): Promise<DiscourseApiResponse<any>> {
    const endpoint = `/c/${categorySlug}/l/latest.json${queryParams ? `?${queryParams}` : ''}`;
    return this.makeRequest<any>(endpoint);
  }

  async getTopic(
    topicId: number,
    options?: {
      includeRaw?: boolean;
      trackVisit?: boolean;
      includePostActions?: boolean;
      includeSuggested?: boolean;
      page?: number;
    }
  ): Promise<DiscourseApiResponse<any>> {
    const params = new URLSearchParams();
    
    // Get raw markdown for editing capability
    if (options?.includeRaw) {
      params.append('include_raw', '1');
    }
    
    // Track visit for analytics
    if (options?.trackVisit !== false) {
      params.append('track_visit', '1');
    }
    
    // Include user actions (likes, bookmarks) in response
    if (options?.includePostActions) {
      params.append('include_post_actions', '1');
    }
    
    // Get suggested topics
    if (options?.includeSuggested) {
      params.append('include_suggested', '1');
    }
    
    // Pagination for large topics
    if (options?.page) {
      params.append('page', options.page.toString());
    }
    
    const queryString = params.toString();
    const endpoint = `/t/${topicId}.json${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<any>(endpoint);
  }

  async getTopicPosts(topicId: number, postIds: number[] = []): Promise<DiscourseApiResponse<any>> {
    const postIdsParam = postIds.length > 0 ? `?post_ids=${postIds.join(',')}` : '';
    return this.makeRequest<any>(`/t/${topicId}/posts.json${postIdsParam}`);
  }

  // Create Topics and Posts
  async createTopic(topicData: {
    title: string;
    raw: string;
    category?: string | number;
    tags?: string[];
    archetype?: string;
    pinned_globally?: boolean;
    closed?: boolean;
  }): Promise<DiscourseApiResponse<any>> {
    // Validate required fields
    if (!topicData.title || !topicData.raw) {
      return { success: false, error: 'Title and content are required' };
    }

    // Check authentication
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      return { success: false, error: 'Authentication required to create topics' };
    }

    // Sanitize input
    const sanitizedData = {
      title: SecurityValidator.sanitizeInput(topicData.title),
      raw: SecurityValidator.sanitizeInput(topicData.raw),
      category: topicData.category ? (typeof topicData.category === 'string' ? SecurityValidator.sanitizeInput(topicData.category) : topicData.category) : undefined,
      tags: topicData.tags ? topicData.tags.map(tag => SecurityValidator.sanitizeInput(tag)) : undefined,
      archetype: topicData.archetype || 'regular',
      pinned_globally: topicData.pinned_globally || false,
      closed: topicData.closed || false,
    };

    console.log('🌐 Creating topic with Discourse API:', {
      title: sanitizedData.title,
      category: sanitizedData.category,
      tags: sanitizedData.tags,
      archetype: sanitizedData.archetype,
    });

    // Use the correct Discourse API endpoint for creating topics
    return this.makeRequest<any>('/t.json', {
      method: 'POST',
      body: JSON.stringify(sanitizedData),
    });
  }

  async createPost(postData: {
    raw: string;
    topic_id: number;
    reply_to_post_number?: number;
  }): Promise<DiscourseApiResponse<any>> {
    // Validate required fields
    if (!postData.raw || !postData.topic_id) {
      return { success: false, error: 'Content and topic ID are required' };
    }

    // Check authentication
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      return { success: false, error: 'Authentication required to create posts' };
    }

    // Sanitize input
    const sanitizedData = {
      raw: SecurityValidator.sanitizeInput(postData.raw),
      topic_id: postData.topic_id,
      reply_to_post_number: postData.reply_to_post_number,
    };

    console.log('💬 Creating post with Discourse API:', {
      topicId: sanitizedData.topic_id,
      contentLength: sanitizedData.raw.length,
      replyToPostNumber: sanitizedData.reply_to_post_number
    });

    return this.makeRequest<any>('/posts.json', {
      method: 'POST',
      body: JSON.stringify(sanitizedData),
    });
  }

  // Notifications
  async getNotifications(): Promise<DiscourseApiResponse<any>> {
    return this.makeRequest<any>('/notifications.json');
  }

  async markNotificationAsRead(notificationId: number): Promise<DiscourseApiResponse<void>> {
    // Discourse marks a single notification via PUT /notifications/mark-read.json with id
    return this.makeRequest<void>('/notifications/mark-read.json', {
      method: 'PUT',
      body: JSON.stringify({ id: notificationId }),
    });
  }

  async markAllNotificationsAsRead(): Promise<DiscourseApiResponse<void>> {
    // Discourse API uses PUT /notifications/mark-read.json
    return this.makeRequest<void>('/notifications/mark-read.json', {
      method: 'PUT',
    });
  }

  // User and Category Methods
  async getUser(userId: number): Promise<DiscourseApiResponse<DiscourseUser>> {
    return this.makeRequest<DiscourseUser>(`/admin/users/${userId}.json`);
  }

  async getCategory(categoryId: number): Promise<DiscourseApiResponse<any>> {
    return this.makeRequest<any>(`/c/${categoryId}/show.json`);
  }

  async getCategories(includeSubcategories: boolean = true): Promise<DiscourseApiResponse<any>> {
    const endpoint = includeSubcategories 
      ? '/categories.json?include_subcategories=true'
      : '/categories.json';
    return this.makeRequest<any>(endpoint);
  }

  // Like/Bookmark Actions
  async unlikePost(postId: number): Promise<DiscourseApiResponse<any>> {
    // Official Discourse API: DELETE /post_actions/{postId}.json?post_action_type_id=2
    return this.makeRequest<any>(`/post_actions/${postId}.json?post_action_type_id=2`, {
      method: 'DELETE',
    });
  }

  async bookmarkPost(postId: number): Promise<DiscourseApiResponse<void>> {
    try {
      const response = await this.makeRequest<any>(`/post_actions`, {
        method: 'POST',
        body: JSON.stringify({
          id: postId,
          post_action_type_id: 1, // Bookmark action type
        }),
      });
      return {
        success: response.success,
        error: response.error,
      };
    } catch (error) {
      return { success: false, error: 'Network error bookmarking post' };
    }
  }

  async unbookmarkPost(postId: number): Promise<DiscourseApiResponse<void>> {
    try {
      const response = await this.makeRequest<any>(`/post_actions/${postId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          post_action_type_id: 1, // Bookmark action type
        }),
      });
      return {
        success: response.success,
        error: response.error,
      };
    } catch (error) {
      return { success: false, error: 'Network error unbookmarking post' };
    }
  }

  // Comment/Reply Actions
  async createReply(topicId: number, content: string, replyToPostNumber?: number): Promise<DiscourseApiResponse<any>> {
    const postData = {
      topic_id: topicId,
      raw: content,
      reply_to_post_number: replyToPostNumber,
    };

    return this.makeRequest<any>('/posts.json', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  // Search
  async searchTopics(query: string, options: {
    limit?: number;
    order?: 'latest' | 'created' | 'updated' | 'views' | 'likes' | 'relevance';
    category?: string;
    tags?: string[];
    author?: string;
  } = {}): Promise<DiscourseApiResponse<any>> {
    return this.search(query, { ...options, type: 'topic' });
  }

  async searchCategories(query: string, options: {
    limit?: number;
    includeSubcategories?: boolean;
  } = {}): Promise<DiscourseApiResponse<any>> {
    return this.search(query, { ...options, type: 'category' });
  }

  async searchUsers(query: string, options: {
    limit?: number;
    order?: 'latest' | 'created' | 'updated' | 'views' | 'likes' | 'relevance';
  } = {}): Promise<DiscourseApiResponse<any>> {
    return this.search(query, { ...options, type: 'user' });
  }

  // Enhanced search method that can search across topics, categories, and users
  async search(query: string, options: {
    type?: 'topic' | 'category' | 'user' | 'all';
    limit?: number;
    includeBlurbs?: boolean;
    order?: 'latest' | 'created' | 'updated' | 'views' | 'likes' | 'relevance';
    period?: 'all' | 'yearly' | 'quarterly' | 'monthly' | 'weekly' | 'daily';
    category?: string;
    tags?: string[];
    author?: string;
    status?: 'open' | 'closed' | 'archived' | 'visible' | 'hidden';
  } = {}): Promise<DiscourseApiResponse<SearchResult>> {
    const { 
      type = 'all', 
      limit = 30, 
      includeBlurbs = true,
      order = 'relevance',
      period = 'all',
      category,
      tags,
      author,
      status
    } = options;
    
    // Build search query with advanced parameters
    let searchQuery = query.trim();
    
    // Add category filter if specified
    if (category) {
      searchQuery += ` category:${category}`;
    }
    
    // Add author filter if specified
    if (author) {
      searchQuery += ` author:${author}`;
    }
    
    // Add tags filter if specified
    if (tags && tags.length > 0) {
      searchQuery += ` tags:${tags.join(',')}`;
    }
    
    // Add status filter if specified
    if (status) {
      searchQuery += ` status:${status}`;
    }
    
    // Build endpoint with basic parameters first
    let endpoint = `/search.json?q=${encodeURIComponent(searchQuery)}`;
    
    // Add limit
    if (limit) {
      endpoint += `&limit=${limit}`;
    }
    
    // Add blurbs
    if (includeBlurbs) {
      endpoint += '&include_blurbs=true';
    }
    
    // Add type filter (only if not 'all')
    if (type !== 'all') {
      endpoint += `&type=${type}`;
    }
    
    // Add order
    if (order && order !== 'relevance') {
      endpoint += `&order=${order}`;
    }
    
    // Add period
    if (period && period !== 'all') {
      endpoint += `&period=${period}`;
    }
    
    const response = await this.makeRequest<any>(endpoint);
    
    // Log raw response for debugging
    console.log('🔍 Raw Discourse Search Response:', {
      success: response.success,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      postsCount: response.data?.posts?.length || 0,
      topicsCount: response.data?.topics?.length || 0,
      categoriesCount: response.data?.categories?.length || 0,
      usersCount: response.data?.users?.length || 0,
      groupsCount: response.data?.groups?.length || 0,
    });
    
    // Map the response if successful - use only what search API provides
    if (response.success && response.data) {
      return {
        success: true,
        data: this.mapSearchResults(response.data)
      };
    }
    
    return response;
  }

  // Map Discourse search response to SearchResult format
  private mapSearchResults(discourseResponse: any): SearchResult {
    // Discourse search API returns: { posts: [], topics: [], categories: [], users: [], groups: [] }
    const posts = discourseResponse.posts || [];
    const topics = discourseResponse.topics || [];
    const categories = discourseResponse.categories || [];
    const users = discourseResponse.users || [];
    
    console.log('🔍 Mapping search results:', {
      postsCount: posts.length,
      topicsCount: topics.length,
      categoriesCount: categories.length,
      usersCount: users.length
    });
    
    // Create a category lookup map to enrich topic category data
    const categoryLookup = new Map<number, any>();
    categories.forEach((cat: any) => {
      if (cat.id) {
        categoryLookup.set(cat.id, {
          name: cat.name || '',
          color: cat.color || '000000',
          parent_category_id: cat.parent_category_id,
        });
      }
    });
    
    // Create a user lookup map to enrich topic author data
    // Search API returns users separately, we need to match them to topics
    const userLookupById = new Map<number, any>();
    const userLookupByUsername = new Map<string, any>();
    users.forEach((user: any) => {
      if (user.id) {
        userLookupById.set(user.id, user);
      }
      if (user.username) {
        userLookupByUsername.set(user.username.toLowerCase(), user);
      }
    });
    
    if (__DEV__) {
      console.log('🔍 mapSearchResults: User lookup maps created', {
        usersCount: users.length,
        userLookupByIdSize: userLookupById.size,
        userLookupByUsernameSize: userLookupByUsername.size,
      });
      
      // Log raw search API data structure for debugging
      if (topics.length > 0) {
        console.log('🔍 mapSearchResults: Raw search API data', {
          topicsCount: topics.length,
          usersCount: users.length,
          sampleTopic: {
            id: topics[0].id,
            title: topics[0].title,
            hasBlurb: !!topics[0].blurb,
            hasExcerpt: !!topics[0].excerpt,
            categoryId: topics[0].category_id,
            postersCount: topics[0].posters?.length || 0,
            firstPosterUserId: topics[0].posters?.[0]?.user_id,
            firstPosterUsername: topics[0].posters?.[0]?.username,
            topicKeys: Object.keys(topics[0]),
          },
          sampleUser: users[0] ? {
            id: users[0].id,
            username: users[0].username,
            name: users[0].name,
            hasAvatarTemplate: !!users[0].avatar_template,
          } : null,
        });
      }
    }
    
    // Map topics to bytes - enrich with category, author, and excerpt/blurb data
    const bytes: Byte[] = topics.map((topic: any) => {
      try {
        // Debug: Log topic structure for first topic to understand what fields are available
        if (__DEV__ && topics.indexOf(topic) === 0) {
          console.log('🔍 mapSearchResults: Sample topic structure', {
            topicId: topic.id,
            topicTitle: topic.title,
            hasBlurb: !!topic.blurb,
            hasExcerpt: !!topic.excerpt,
            hasUserId: !!topic.user_id,
            hasUsername: !!topic.username,
            hasPosters: !!(topic.posters && topic.posters.length > 0),
            hasDetails: !!topic.details,
            hasCreatedBy: !!topic.details?.created_by,
            hasLastPoster: !!topic.last_poster,
            topicKeys: Object.keys(topic),
          });
        }
        
        // Extract blurb/excerpt from search results (Discourse search API includes these)
        // Search API returns 'blurb' field when include_blurbs=true
        if (topic.blurb && !topic.excerpt) {
          topic.excerpt = topic.blurb;
          if (__DEV__) {
            console.log(`📝 mapSearchResults: Extracted blurb as excerpt for topic ${topic.id}`, {
              blurbLength: topic.blurb.length,
              blurbPreview: topic.blurb.substring(0, 100),
            });
          }
        }
        
        // Enrich topic with category data if category name is missing
        if (topic.category_id && (!topic.category || !topic.category.name)) {
          const categoryInfo = categoryLookup.get(topic.category_id);
          if (categoryInfo) {
            if (!topic.category) {
              topic.category = {};
            }
            topic.category.id = topic.category_id;
            topic.category.name = categoryInfo.name;
            topic.category.color = categoryInfo.color;
            topic.category.parent_category_id = categoryInfo.parent_category_id;
          }
        }
        
        // Enrich topic with author data from users array if missing
        // Discourse search API: topics have posters array with user_id references, users are separate
        
        // Match author from users array in search response (no extra API calls)
        // Discourse search API: topics have posters array with user_id references, users are separate
        if (!topic.details?.created_by && !topic.last_poster) {
          let authorUser: any = null;
          
          // PRIORITY 1: Check posters array first (most reliable in search results)
          // The first poster is typically the original author
          if (topic.posters && topic.posters.length > 0) {
            const firstPoster = topic.posters[0];
            
            // Always log first topic for debugging (not just in __DEV__)
            if (topics.indexOf(topic) === 0) {
              console.log('🔍 mapSearchResults: First poster structure', {
                topicId: topic.id,
                firstPoster: JSON.stringify(firstPoster, null, 2),
                hasUserId: !!firstPoster.user_id,
                hasUsername: !!firstPoster.username,
                hasUser: !!firstPoster.user,
                posterKeys: Object.keys(firstPoster),
                userLookupByIdSize: userLookupById.size,
                userLookupByUsernameSize: userLookupByUsername.size,
              });
            }
            
            // Try user_id first (most common in search API)
            if (firstPoster.user_id) {
              authorUser = userLookupById.get(firstPoster.user_id);
              if (authorUser) {
                console.log(`✅ mapSearchResults: Matched author by poster.user_id for topic ${topic.id}`, {
                  posterUserId: firstPoster.user_id,
                  matchedUserId: authorUser.id,
                  username: authorUser.username,
                });
              } else if (topics.indexOf(topic) === 0) {
                console.warn(`⚠️ mapSearchResults: poster.user_id ${firstPoster.user_id} not found in userLookupById`, {
                  availableUserIds: Array.from(userLookupById.keys()).slice(0, 10),
                });
              }
            }
            
            // If not found by user_id, try username
            if (!authorUser && firstPoster.username) {
              authorUser = userLookupByUsername.get(firstPoster.username.toLowerCase());
              if (authorUser) {
                console.log(`✅ mapSearchResults: Matched author by poster.username for topic ${topic.id}`, {
                  posterUsername: firstPoster.username,
                  matchedUserId: authorUser.id,
                });
              } else if (topics.indexOf(topic) === 0) {
                console.warn(`⚠️ mapSearchResults: poster.username "${firstPoster.username}" not found in userLookupByUsername`, {
                  availableUsernames: Array.from(userLookupByUsername.keys()).slice(0, 10),
                });
              }
            }
            
            // If poster has full user object, use it directly
            if (!authorUser && firstPoster.user) {
              authorUser = firstPoster.user;
              console.log(`✅ mapSearchResults: Using poster.user object for topic ${topic.id}`);
            }
          }
          
          // PRIORITY 2: Check topic-level fields (less common in search API)
          if (!authorUser && topic.user_id) {
            authorUser = userLookupById.get(topic.user_id);
            if (authorUser) {
              console.log(`✅ mapSearchResults: Matched author by topic.user_id for topic ${topic.id}`);
            }
          }
          
          if (!authorUser && topic.username) {
            authorUser = userLookupByUsername.get(topic.username.toLowerCase());
            if (authorUser) {
              console.log(`✅ mapSearchResults: Matched author by topic.username for topic ${topic.id}`);
            }
          }
          
          // PRIORITY 3: Fallback to last_poster
          if (!authorUser && topic.last_poster_username) {
            const lastPosterUser = userLookupByUsername.get(topic.last_poster_username.toLowerCase());
            if (lastPosterUser) {
              authorUser = lastPosterUser;
              if (__DEV__) {
                console.log(`✅ mapSearchResults: Using last_poster from users array for topic ${topic.id}`);
              }
            } else {
              // Create minimal user object from last_poster_username
              authorUser = {
                id: 0,
                username: topic.last_poster_username,
                name: topic.last_poster_username,
                avatar_template: topic.last_poster_avatar_template || '',
              };
              if (__DEV__) {
                console.warn(`⚠️ mapSearchResults: Using fallback last_poster for topic ${topic.id} (not in users array)`);
              }
            }
          }
          
          // Set the author if we found one
          if (authorUser) {
            topic.details = topic.details || {};
            topic.details.created_by = authorUser;
            console.log(`👤 mapSearchResults: Final author set for topic ${topic.id}`, {
              authorId: authorUser.id,
              username: authorUser.username,
              name: authorUser.name,
              hasAvatarTemplate: !!authorUser.avatar_template,
            });
          } else {
            // Always log warnings for missing authors (not just in __DEV__)
            console.warn(`⚠️ mapSearchResults: Could not find author for topic ${topic.id}`, {
              hasPosters: !!(topic.posters && topic.posters.length > 0),
              postersCount: topic.posters?.length || 0,
              firstPosterUserId: topic.posters?.[0]?.user_id,
              firstPosterUsername: topic.posters?.[0]?.username,
              hasUserId: !!topic.user_id,
              hasUsername: !!topic.username,
              hasLastPosterUsername: !!topic.last_poster_username,
              usersArraySize: userLookupById.size,
              sampleUserIds: Array.from(userLookupById.keys()).slice(0, 5),
            });
          }
        }
        
        return this.mapTopicToByte(topic);
      } catch (error) {
        console.error('Error mapping topic to byte:', error, topic);
        return null;
      }
    }).filter((byte: Byte | null): byte is Byte => byte !== null);
    
    // Map categories to hubs
    const hubs: Hub[] = categories.map((category: any) => {
      try {
        return this.mapCategoryToHub(category);
      } catch (error) {
        console.error('Error mapping category to hub:', error, category);
        return null;
      }
    }).filter((hub: Hub | null): hub is Hub => hub !== null);
    
    // Map users - Discourse search API returns users with minimal data
    const appUsers: AppUser[] = users.map((user: any) => {
      try {
        // Debug: Log raw user data from search API
        if (__DEV__ && users.indexOf(user) === 0) {
          console.log('🔍 mapSearchResults: Sample user structure from search API', {
            userId: user.id,
            username: user.username,
            name: user.name,
            hasAvatarTemplate: !!user.avatar_template,
            hasBioRaw: !!user.bio_raw,
            hasPostCount: !!user.post_count,
            hasCreatedAt: !!user.created_at,
            userKeys: Object.keys(user),
          });
        }
        
        return this.mapDiscourseUserToAppUser(user);
      } catch (error) {
        console.error('Error mapping user:', error, user);
        return null;
      }
    }).filter((user: AppUser | null): user is AppUser => user !== null);
    
    if (__DEV__) {
      console.log('✅ mapSearchResults: Mapped users', {
        inputUsersCount: users.length,
        outputAppUsersCount: appUsers.length,
        sampleUser: appUsers[0] ? {
          id: appUsers[0].id,
          username: appUsers[0].username,
          name: appUsers[0].name,
          hasAvatar: !!appUsers[0].avatar,
          hasBio: !!appUsers[0].bio,
          joinedDate: appUsers[0].joinedDate,
        } : null,
      });
    }
    
    // Map posts (excluding first post of each topic) to comments
    // Note: Search API posts might not have is_first_post flag, so we'll filter by post_number === 1
    const comments: Comment[] = posts
      .filter((post: any) => {
        // Exclude first posts (they're the byte content)
        // Check if post_number exists and is not 1, or if is_first_post flag exists
        return post.post_number !== 1 && !post.is_first_post;
      })
      .map((post: any) => {
        try {
          // For search results, we might not have full topic data
          // Create a minimal topic object for mapping
          const topicData = {
            id: post.topic_id,
            title: post.topic_title || 'Untitled',
            slug: post.topic_slug || ''
          };
          return this.mapPostToComment(post, topicData);
        } catch (error) {
          console.error('Error mapping post to comment:', error, post);
          return null;
        }
      })
      .filter((comment: Comment | null): comment is Comment => comment !== null);
    
    const totalResults = bytes.length + hubs.length + appUsers.length + comments.length;
    
    console.log('✅ Mapped search results:', {
      bytes: bytes.length,
      hubs: hubs.length,
      users: appUsers.length,
      comments: comments.length,
      total: totalResults
    });
    
    return {
      bytes,
      comments,
      users: appUsers,
      hubs,
      totalResults
    };
  }

  // Advanced search with filters
  async advancedSearch(filters: {
    query: string;
    type?: 'topic' | 'category' | 'user' | 'all';
    category?: string;
    tags?: string[];
    author?: string;
    status?: 'open' | 'closed' | 'archived' | 'visible' | 'hidden';
    order?: 'latest' | 'created' | 'updated' | 'views' | 'likes' | 'relevance';
    period?: 'all' | 'yearly' | 'quarterly' | 'monthly' | 'weekly' | 'daily';
    limit?: number;
    includeBlurbs?: boolean;
  }): Promise<DiscourseApiResponse<any>> {
    return this.search(filters.query, filters);
  }

  // Quick search for instant results
  async quickSearch(query: string): Promise<DiscourseApiResponse<any>> {
    return this.search(query, {
      limit: 10,
      order: 'relevance',
      includeBlurbs: false
    });
  }

  // Note: Search suggestions endpoint may not be available on all Discourse instances
  // async getSearchSuggestions(query: string): Promise<DiscourseApiResponse<any>> {
  //   const endpoint = `/search/suggest.json?q=${encodeURIComponent(query)}`;
  //   return this.makeRequest<any>(endpoint);
  // }

  // Utility Methods
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  // Entity Mapping Methods for Simplified Structure
  mapCategoryToHub(category: any): Hub {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug || category.name.toLowerCase().replace(/\s+/g, '-'),
      description: category.description || '',
      color: `#${category.color}`,
      textColor: category.text_color ? `#${category.text_color}` : '#000000',
      icon: category.icon || undefined,
      parentId: category.parent_category_id,
      topicsCount: category.topic_count || 0,
      postsCount: category.post_count || 0,
      isSubscribed: false, // TODO: Determine from user preferences
      discourseId: category.id
    };
  }

  mapTopicToByte(topic: any): Byte {
    // Detect if this is a summary (no post_stream) or full topic
    const isSummary = !topic.post_stream;
    
    // Debug: Log what author data we have before mapping (always log for search results)
    const isSearchResult = !topic.post_stream && topic.category_id; // Search results are summaries
    if (isSearchResult) {
      console.log('🔍 mapTopicToByte: Author data check for search result', {
        topicId: topic.id,
        hasDetails: !!topic.details,
        hasCreatedBy: !!topic.details?.created_by,
        createdById: topic.details?.created_by?.id,
        createdByUsername: topic.details?.created_by?.username,
        hasPosters: !!(topic.posters && topic.posters.length > 0),
        hasLastPoster: !!topic.last_poster,
        lastPosterId: topic.last_poster?.id,
        lastPosterUsername: topic.last_poster?.username,
      });
    }
    
    // Extract original poster - prefer created_by, then original poster from posters array, fallback to last_poster
    let authorUser = topic.details?.created_by;
    
    if (!authorUser && topic.posters && topic.posters.length > 0) {
      // Try to find original poster from posters array
      const originalPoster = topic.posters.find((poster: any) => 
        poster.description?.includes('Original Poster') || 
        poster.extras?.includes('single') ||
        poster.description?.includes('Creator')
      ) || topic.posters[0];
      
      // If poster has user object, use it
      if (originalPoster?.user) {
        authorUser = originalPoster.user;
      }
    }
    
    // Fallback to username/user_id if present on topic
    if (!authorUser && (topic.username || topic.user_id)) {
      authorUser = {
        id: topic.user_id || 0,
        username: topic.username || 'unknown',
        name: topic.name || topic.username || 'Unknown User',
        avatar_template: topic.avatar_template || topic.last_poster_avatar_template || '',
      };
      if (__DEV__ && topic.id) {
        console.warn(`⚠️ mapTopicToByte: Topic ${topic.id} - Using topic.username fallback for author`);
      }
    }

    // Fallback to last_poster only if we couldn't find original creator
    if (!authorUser) {
      authorUser = topic.last_poster;
      if (__DEV__ && topic.id) {
        console.warn(`⚠️ mapTopicToByte: Topic ${topic.id} - Using last_poster as fallback (original creator not found)`);
      }
    }
    
    return {
      id: topic.id,
      title: topic.title,
      excerpt: topic.excerpt,
      // For summaries: use excerpt as content, for full topics: use post_stream
      content: isSummary 
        ? (topic.excerpt || '')  // Summary: excerpt IS the content
        : (topic.post_stream?.posts?.[0]?.cooked || ''), // Full: use cooked HTML
      rawContent: isSummary 
        ? ''  // Summaries don't have raw markdown
        : (topic.post_stream?.posts?.[0]?.raw || ''),
      hubId: topic.category_id,
      hubName: topic.category?.name || '',
      author: this.mapDiscourseUserToAppUser(authorUser),
      category: {
        id: topic.category_id,
        name: topic.category?.name || '',
        color: topic.category?.color || '000000'
      },
      commentCount: Math.max(0, (topic.posts_count || 1) - 1), // Exclude the original post
      replyCount: Math.max(0, (topic.posts_count || 1) - 1),
      lastActivity: topic.last_posted_at,
      createdAt: topic.created_at,
      updatedAt: topic.updated_at || topic.created_at,
      isPinned: topic.pinned || false,
      isLocked: topic.closed || false,
      isLiked: topic.liked || 
               (topic.details?.actions_summary?.some((a: any) => a.id === 2 && a.acted) || false),
      likeCount: topic.like_count || 0,
      viewCount: topic.views || 0,
      tags: topic.tags || [],
      discourseId: topic.id,
      // Add bookmark state if available
      isBookmarked: topic.details?.bookmarked || false,
    };
  }

  mapPostToComment(post: any, topic: any): Comment {
    return {
      id: post.id,
      content: post.cooked, // HTML content
      rawContent: post.raw || '', // Raw markdown content
      author: this.mapDiscourseUserToAppUser(post.user),
      byteId: post.topic_id,
      byteTitle: topic.title,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      likeCount: post.like_count || 0,
      isLiked: post.liked || false,
      replyToPostNumber: post.reply_to_post_number,
      replyToId: post.reply_to_post_number ? 
        this.getPostIdByNumber(post.topic_id, post.reply_to_post_number) : 
        undefined,
      postNumber: post.post_number,
      discourseId: post.id
    };
  }

  mapDiscourseUserToAppUser(discourseUser: any): AppUser {
    // Debug logging to understand the input data
    console.log('🔍 mapDiscourseUserToAppUser input:', {
      discourseUser: discourseUser ? 'present' : 'null',
      hasId: discourseUser?.id !== undefined,
      id: discourseUser?.id,
      username: discourseUser?.username,
      name: discourseUser?.name,
      email: discourseUser?.email
    });

    if (!discourseUser) {
      console.log('🔍 mapDiscourseUserToAppUser: No user data, returning default');
      return {
        id: '0',
        name: 'Unknown User',
        username: 'unknown',
        email: '',
        avatar: '',
        bio: '',
        followers: 0,
        following: 0,
        bytes: 0,
        comments: 0,
        joinedDate: 'Unknown'
      };
    }

    // Handle cases where user data might be incomplete
    const userId = discourseUser.id;
    const username = discourseUser.username;
    const name = discourseUser.name;
    const email = discourseUser.email;

    // Validate required fields
    if (!userId && !username) {
      console.log('🔍 mapDiscourseUserToAppUser: Missing required fields (id and username)');
      return {
        id: '0',
        name: 'Unknown User',
        username: 'unknown',
        email: '',
        avatar: '',
        bio: '',
        followers: 0,
        following: 0,
        bytes: 0,
        comments: 0,
        joinedDate: 'Unknown'
      };
    }

    // Handle avatar: Discourse search API might return avatar_template or direct avatar URL
    let avatarUrl = '';
    if (discourseUser.avatar_template) {
      avatarUrl = this.getAvatarUrl(discourseUser.avatar_template, 120);
    } else if (discourseUser.avatar) {
      // If avatar is already an absolute URL, use it; otherwise normalize it
      const avatar = discourseUser.avatar;
      if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        avatarUrl = avatar;
      } else {
        // Relative URL, make it absolute
        avatarUrl = `${this.config.baseUrl}${avatar.startsWith('/') ? avatar : `/${avatar}`}`;
      }
    }
    
    const appUser = {
      id: userId ? userId.toString() : '0',
      name: name || username || 'Unknown User',
      username: username || 'unknown',
      email: email || '',
      avatar: avatarUrl,
      bio: discourseUser.bio_raw || discourseUser.bio || '',
      followers: 0, // Not available in Discourse
      following: 0, // Not available in Discourse
      bytes: discourseUser.post_count || discourseUser.topic_count || 0,
      comments: discourseUser.post_count || 0,
      joinedDate: discourseUser.created_at ? 
        `Joined ${new Date(discourseUser.created_at).toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        })}` : 'Unknown'
    };

    console.log('🔍 mapDiscourseUserToAppUser output:', {
      id: appUser.id,
      username: appUser.username,
      name: appUser.name
    });

    return appUser;
  }

  private getPostIdByNumber(topicId: number, postNumber: number): number | undefined {
    // This would need to be implemented with a lookup table or API call
    // For now, return undefined
    return undefined;
  }

  // Simplified API Methods for Hubs → Bytes → Comments structure
  async getHubs(): Promise<DiscourseApiResponse<Hub[]>> {
    try {
      const response = await this.makeRequest<any>('/categories.json');
      if (response.success && response.data?.category_list?.categories) {
        const hubs = response.data.category_list.categories
          .filter((cat: any) => !cat.parent_category_id) // Only top-level categories
          .map((cat: any) => this.mapCategoryToHub(cat));
        
        return {
          success: true,
          data: hubs
        };
      }
      return { success: false, error: 'Failed to load hubs' };
    } catch (error) {
      return { success: false, error: 'Network error loading hubs' };
    }
  }

  async getHub(id: number): Promise<DiscourseApiResponse<Hub>> {
    try {
      const response = await this.makeRequest<any>(`/c/${id}/show.json`);
      if (response.success && response.data?.category) {
        const hub = this.mapCategoryToHub(response.data.category);
        return {
          success: true,
          data: hub
        };
      }
      return { success: false, error: 'Hub not found' };
    } catch (error) {
      return { success: false, error: 'Network error loading hub' };
    }
  }

  async getBytes(hubId?: number, page: number = 0): Promise<DiscourseApiResponse<Byte[]>> {
    try {
      let endpoint = '/latest.json';
      if (hubId) {
        endpoint = `/c/${hubId}.json`;
      }
      if (page > 0) {
        // Handle query params correctly - use ? or & depending on existing params
        endpoint += endpoint.includes('?') ? `&page=${page}` : `?page=${page}`;
      }

      console.log('🔍 getBytes: Fetching from endpoint:', endpoint);
      const response = await this.makeRequest<any>(endpoint);
      
      console.log('🔍 getBytes: Response received', {
        success: response.success,
        hasData: !!response.data,
        hasTopicList: !!response.data?.topic_list,
        hasTopics: !!response.data?.topic_list?.topics,
        topicsCount: response.data?.topic_list?.topics?.length || 0,
        error: response.error,
        status: response.status,
      });

      if (response.success && response.data?.topic_list?.topics) {
        const bytes = response.data.topic_list.topics.map((topic: any) => 
          this.mapTopicToByte(topic)
        );
        
        console.log('✅ getBytes: Successfully mapped', bytes.length, 'bytes');
        return {
          success: true,
          data: bytes
        };
      }
      
      // Provide more detailed error information
      const errorMessage = response.error || 
        (response.data ? 'Unexpected response structure' : 'No data received') ||
        'Failed to load bytes';
      
      console.error('❌ getBytes: Failed to load bytes', {
        error: errorMessage,
        responseData: response.data ? Object.keys(response.data) : 'no data',
        topicListKeys: response.data?.topic_list ? Object.keys(response.data.topic_list) : 'no topic_list',
      });
      
      return { 
        success: false, 
        error: errorMessage,
        status: response.status 
      };
    } catch (error) {
      console.error('❌ getBytes: Exception caught', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error loading bytes' 
      };
    }
  }

  async getByte(id: number): Promise<DiscourseApiResponse<Byte>> {
    try {
      const response = await this.makeRequest<any>(`/t/${id}.json`);
      if (response.success && response.data) {
        const byte = this.mapTopicToByte(response.data);
        return {
          success: true,
          data: byte
        };
      }
      return { success: false, error: 'Byte not found' };
    } catch (error) {
      return { success: false, error: 'Network error loading byte' };
    }
  }

  async createByte(data: {
    title: string;
    content: string;
    hubId: number;
  }): Promise<DiscourseApiResponse<Byte>> {
    try {
      const response = await this.makeRequest<any>('/posts.json', {
        method: 'POST',
        body: JSON.stringify({
          title: data.title,
          raw: data.content,
          category: data.hubId,
          archetype: 'regular'
        })
      });

      if (response.success && response.data?.topic_id) {
        // Fetch the created topic to return as Byte
        return this.getByte(response.data.topic_id);
      }
      return { success: false, error: 'Failed to create byte' };
    } catch (error) {
      return { success: false, error: 'Network error creating byte' };
    }
  }

  async getComments(byteId: number): Promise<DiscourseApiResponse<Comment[]>> {
    try {
      const response = await this.makeRequest<any>(`/t/${byteId}.json`);
      if (response.success && response.data?.post_stream?.posts) {
        const comments = response.data.post_stream.posts
          .slice(1) // Skip the first post (it's the byte content)
          .map((post: any) => this.mapPostToComment(post, response.data));
        
        return {
          success: true,
          data: comments
        };
      }
      return { success: false, error: 'Failed to load comments' };
    } catch (error) {
      return { success: false, error: 'Network error loading comments' };
    }
  }

  async createComment(data: {
    content: string;
    byteId: number;
    replyToPostNumber?: number;
  }): Promise<DiscourseApiResponse<Comment>> {
    try {
      console.log('📤 Creating comment:', {
        byteId: data.byteId,
        replyToPostNumber: data.replyToPostNumber,
        contentLength: data.content.length
      });

      const response = await this.makeRequest<any>('/posts.json', {
        method: 'POST',
        body: JSON.stringify({
          raw: data.content,
          topic_id: data.byteId,
          reply_to_post_number: data.replyToPostNumber
        })
      });

      console.log('📥 createComment response:', {
        success: response.success,
        hasData: !!response.data,
        error: response.error,
        errors: response.errors,
        status: response.status
      });

      if (!response.success) {
        // Extract detailed error message
        const errorMessage = response.error || 
                            (response.errors && Array.isArray(response.errors) ? response.errors.join(', ') : 'Unknown error') ||
                            'Failed to create comment';
        console.error('❌ createComment failed:', errorMessage);
        return { 
          success: false, 
          error: errorMessage,
          errors: response.errors,
          status: response.status
        };
      }

      if (response.success && response.data?.id) {
        // Fetch the topic to get the new post
        const topicResponse = await this.makeRequest<any>(`/t/${data.byteId}.json`);
        if (topicResponse.success && topicResponse.data) {
          const newPost = topicResponse.data.post_stream.posts.find((p: any) => p.id === response.data.id);
          if (newPost) {
            const comment = this.mapPostToComment(newPost, topicResponse.data);
            console.log('✅ Comment created successfully:', comment.id);
            return {
              success: true,
              data: comment
            };
          }
        }
      }
      
      return { 
        success: false, 
        error: response.error || 'Failed to create comment - no post ID returned'
      };
    } catch (error) {
      console.error('❌ createComment exception:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Network error creating comment';
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  async updateComment(commentId: number, content: string): Promise<DiscourseApiResponse<Comment>> {
    try {
      // Check authentication
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        return { success: false, error: 'Authentication required to update comments' };
      }

      // Validate content
      if (!content || content.trim().length === 0) {
        return { success: false, error: 'Comment content cannot be empty' };
      }

      // Sanitize input
      const sanitizedContent = SecurityValidator.sanitizeInput(content);

      console.log('📝 Updating comment:', { commentId, contentLength: sanitizedContent.length });

      const response = await this.makeRequest<any>(`/posts/${commentId}.json`, {
        method: 'PUT',
        body: JSON.stringify({
          post: {
            raw: sanitizedContent,
            edit_reason: 'Updated via Fomio'
          }
        })
      });

      if (response.success && response.data) {
        // Fetch the updated post to return as Comment
        const postResponse = await this.makeRequest<any>(`/posts/${commentId}.json`);
        if (postResponse.success && postResponse.data) {
          // Need to fetch the topic to get full context
          const topicId = postResponse.data.topic_id;
          const topicResponse = await this.makeRequest<any>(`/t/${topicId}.json`);
          if (topicResponse.success && topicResponse.data) {
            const comment = this.mapPostToComment(postResponse.data, topicResponse.data);
            return {
              success: true,
              data: comment
            };
          }
        }
      }

      return { 
        success: false, 
        error: response.error || 'Failed to update comment' 
      };
    } catch (error) {
      return { success: false, error: 'Network error updating comment' };
    }
  }

  async deleteComment(commentId: number): Promise<DiscourseApiResponse<void>> {
    try {
      // Check authentication
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        return { success: false, error: 'Authentication required to delete comments' };
      }

      console.log('🗑️ Deleting comment:', commentId);

      const response = await this.makeRequest<void>(`/posts/${commentId}.json`, {
        method: 'DELETE'
      });

      return {
        success: response.success,
        error: response.error
      };
    } catch (error) {
      return { success: false, error: 'Network error deleting comment' };
    }
  }

  async likeByte(byteId: number): Promise<DiscourseApiResponse<void>> {
    try {
      // Get the topic to find the first post ID
      const topicResponse = await this.makeRequest<any>(`/t/${byteId}.json`);
      if (topicResponse.success && topicResponse.data?.post_stream?.posts?.[0]) {
        const firstPostId = topicResponse.data.post_stream.posts[0].id;
        return this.likePost(firstPostId);
      }
      return { success: false, error: 'Failed to find byte post' };
    } catch (error) {
      return { success: false, error: 'Network error liking byte' };
    }
  }

  async likeComment(commentId: number): Promise<DiscourseApiResponse<void>> {
    return this.likePost(commentId);
  }

  async likePost(postId: number): Promise<DiscourseApiResponse<void>> {
    try {
      const response = await this.makeRequest<any>('/post_actions.json', {
        method: 'POST',
        body: JSON.stringify({
          id: postId,
          post_action_type_id: 2, // Like action type
          flag_topic: false
        })
      });

      return {
        success: response.success,
        error: response.error
      };
    } catch (error) {
      return { success: false, error: 'Network error liking post' };
    }
  }

  // Topic management methods
  async setNotificationLevel(topicId: number, level: number): Promise<DiscourseApiResponse<void>> {
    try {
      const response = await this.makeRequest<void>(`/t/${topicId}/notifications.json`, {
        method: 'POST',
        body: JSON.stringify({
          notification_level: level,
        }),
      });
      return response;
    } catch (error) {
      return { success: false, error: 'Network error setting notification level' };
    }
  }

  async getTopicBookmarkStatus(topicId: number): Promise<DiscourseApiResponse<boolean>> {
    try {
      // Get topic and extract bookmark status from details
      const response = await this.getTopic(topicId);
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.details?.bookmarked || false,
        };
      }
      return { success: false, error: 'Failed to get bookmark status' };
    } catch (error) {
      return { success: false, error: 'Network error getting bookmark status' };
    }
  }

  async toggleTopicBookmark(topicId: number): Promise<DiscourseApiResponse<void>> {
    try {
      // Get current status
      const statusResponse = await this.getTopicBookmarkStatus(topicId);
      if (!statusResponse.success) {
        return { success: false, error: statusResponse.error || 'Failed to get bookmark status' };
      }

      const isBookmarked = statusResponse.data || false;

      if (isBookmarked) {
        // Unbookmark
        const response = await this.makeRequest<void>(`/t/${topicId}/bookmark.json`, {
          method: 'DELETE',
        });
        return response;
      } else {
        // Bookmark
        const response = await this.makeRequest<void>(`/t/${topicId}/bookmark.json`, {
          method: 'PUT',
        });
        return response;
      }
    } catch (error) {
      return { success: false, error: 'Network error toggling bookmark' };
    }
  }

  async getReadPosition(topicId: number): Promise<DiscourseApiResponse<{ lastRead: number; highest: number }>> {
    try {
      const response = await this.getTopic(topicId);
      if (response.success && response.data) {
        return {
          success: true,
          data: {
            lastRead: response.data.details?.last_read_post_number || 0,
            highest: response.data.highest_post_number || response.data.posts_count || 0,
          },
        };
      }
      return { success: false, error: 'Failed to get read position' };
    } catch (error) {
      return { success: false, error: 'Network error getting read position' };
    }
  }

  async pinTopic(topicId: number): Promise<DiscourseApiResponse<void>> {
    try {
      const response = await this.makeRequest<void>(`/t/${topicId}/pin.json`, {
        method: 'PUT',
      });
      return response;
    } catch (error) {
      return { success: false, error: 'Network error pinning topic' };
    }
  }

  async unpinTopic(topicId: number): Promise<DiscourseApiResponse<void>> {
    try {
      const response = await this.makeRequest<void>(`/t/${topicId}/pin.json`, {
        method: 'PUT',
        body: JSON.stringify({ pinned: false }),
      });
      return response;
    } catch (error) {
      return { success: false, error: 'Network error unpinning topic' };
    }
  }

  async closeTopic(topicId: number): Promise<DiscourseApiResponse<void>> {
    try {
      const response = await this.makeRequest<void>(`/t/${topicId}/status.json`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'closed', enabled: true }),
      });
      return response;
    } catch (error) {
      return { success: false, error: 'Network error closing topic' };
    }
  }

  async openTopic(topicId: number): Promise<DiscourseApiResponse<void>> {
    try {
      const response = await this.makeRequest<void>(`/t/${topicId}/status.json`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'closed', enabled: false }),
      });
      return response;
    } catch (error) {
      return { success: false, error: 'Network error opening topic' };
    }
  }

  // User Activity Methods
  async searchUserTopics(username: string, page: number = 0): Promise<DiscourseApiResponse<any>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    
    const searchQuery = `author:${username}`;
    return this.search(searchQuery, {
      type: 'topic',
      limit: 20,
      order: 'created',
      period: 'all',
    });
  }

  async searchUserReplies(username: string, page: number = 0): Promise<DiscourseApiResponse<any>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    
    const searchQuery = `author:${username}`;
    return this.search(searchQuery, {
      type: 'all',
      limit: 20,
      order: 'created',
      period: 'all',
    });
  }

  // User Activity Endpoints
  async getUserActivity(
    username: string,
    activityType: 'all' | 'topics' | 'replies' | 'read' | 'likes' | 'bookmarks' | 'solved' | 'votes',
    page: number = 0
  ): Promise<DiscourseApiResponse<any>> {
    // More permissive username validation for Discourse
    if (!username || username.trim().length < 1) {
      console.warn('⚠️ getUserActivity: Username is required');
      return { success: false, error: 'Username is required' };
    }

    // Check if endpoint requires authentication
    const requiresAuth = ['read', 'drafts', 'likes', 'bookmarks', 'votes'].includes(activityType);
    if (requiresAuth) {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        console.warn('⚠️ getUserActivity: Authentication required for activity type:', activityType);
        return { 
          success: false, 
          error: 'Authentication required for this activity type',
          status: 401,
        };
      }
    }

    const offset = page * 20;
    let endpoint = '';
    let queryParams = '';

    // Map activity types to correct endpoint formats based on reverse-engineered endpoints
    switch (activityType) {
      case 'all':
        // All: /user_actions.json?offset=0&username=soma&filter=4,5
        endpoint = '/user_actions.json';
        queryParams = `?offset=${offset}&username=${encodeURIComponent(username)}&filter=4,5`;
        break;

      case 'topics':
        // Topics: /topics/created-by/soma.json
        endpoint = `/topics/created-by/${encodeURIComponent(username)}.json`;
        if (page > 0) {
          queryParams = `?page=${page}`;
        }
        break;

      case 'replies':
        // Replies: /user_actions.json?offset=0&username=soma&filter=5
        endpoint = '/user_actions.json';
        queryParams = `?offset=${offset}&username=${encodeURIComponent(username)}&filter=5`;
        break;

      case 'read':
        // Read: /read.json (no username, returns current user's read topics)
        endpoint = '/read.json';
        if (page > 0) {
          queryParams = `?offset=${offset}`;
        }
        break;

      case 'likes':
        // Likes: /user_actions.json?offset=1&username=soma&filter=1
        endpoint = '/user_actions.json';
        queryParams = `?offset=${offset}&username=${encodeURIComponent(username)}&filter=1`;
        break;

      case 'bookmarks':
        // Bookmarked: /u/Soma/bookmarks.json?q=&acting_username=
        endpoint = `/u/${encodeURIComponent(username)}/bookmarks.json`;
        queryParams = '?q=&acting_username=';
        if (page > 0) {
          queryParams += `&offset=${offset}`;
        }
        break;

      case 'solved':
        // Solved: /solution/by_user.json?username=Soma&offset=0&limit=20
        endpoint = '/solution/by_user.json';
        queryParams = `?username=${encodeURIComponent(username)}&offset=${offset}&limit=20`;
        break;

      case 'votes':
        // Votes: /topics/voted-by/soma.json
        endpoint = `/topics/voted-by/${encodeURIComponent(username)}.json`;
        if (page > 0) {
          queryParams = `?offset=${offset}`;
        }
        break;

      default:
        return { success: false, error: `Unknown activity type: ${activityType}` };
    }

    const fullUrl = `${this.config.baseUrl}${endpoint}${queryParams}`;
    
    console.log('�� getUserActivity:', {
      username,
      activityType,
      page,
      offset,
      endpoint,
      queryParams,
      fullUrl,
      requiresAuth,
    });
    
    try {
      const response = await this.makeRequest<any>(`${endpoint}${queryParams}`);
      
      // Log the actual response structure for debugging
      console.log('📊 getUserActivity Response:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        status: response.status,
        error: response.error,
        responseStructure: {
          hasUserActions: !!response.data?.user_actions,
          userActionsCount: response.data?.user_actions?.length || 0,
          hasTopicList: !!response.data?.topic_list,
          hasTopics: !!response.data?.topics,
          hasActivities: !!response.data?.activities,
          topicListCount: response.data?.topic_list?.topics?.length || 0,
          topicsCount: response.data?.topics?.length || 0,
        },
      });
      
      return response;
    } catch (error) {
      console.error('❌ getUserActivity Error:', {
        username,
        activityType,
        endpoint,
        queryParams,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error fetching user activity' 
      };
    }
  }

  async getUserDrafts(page: number = 0): Promise<DiscourseApiResponse<any>> {
    try {
      const offset = page * 30;
      const queryParams = `?offset=${offset}&limit=30`;
      return await this.makeRequest<any>(`/drafts.json${queryParams}`);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error fetching drafts' 
      };
    }
  }

  async getDraft(params: { draftKey: string; sequence?: number }): Promise<DiscourseApiResponse<any>> {
    const { draftKey, sequence = 0 } = params;
    try {
      const endpoint = `/drafts/${encodeURIComponent(draftKey)}.json?sequence=${sequence}`;
      return await this.makeRequest<any>(endpoint);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error fetching draft',
      };
    }
  }

  async saveDraft(params: { draftKey: string; draft: Record<string, any>; sequence?: number }): Promise<DiscourseApiResponse<any>> {
    const { draftKey, draft, sequence = 0 } = params;
    try {
      const body = new URLSearchParams();
      body.append('draft', JSON.stringify(draft));
      body.append('draft_key', draftKey);
      body.append('sequence', String(sequence));

      return await this.makeRequest<any>(`/drafts/${encodeURIComponent(draftKey)}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: body.toString(),
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error saving draft',
      };
    }
  }

  async deleteDraft(params: { draftKey: string; sequence?: number }): Promise<DiscourseApiResponse<void>> {
    const { draftKey, sequence = 0 } = params;
    try {
      const endpoint = `/drafts/${encodeURIComponent(draftKey)}.json?sequence=${sequence}`;
      return await this.makeRequest<void>(endpoint, {
        method: 'DELETE',
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error deleting draft',
      };
    }
  }

  async getUserReadTopics(username: string, page: number = 0): Promise<DiscourseApiResponse<any>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }

    return this.getUserActivity(username, 'read', page);
  }

  async getUserLikedPosts(username: string, page: number = 0): Promise<DiscourseApiResponse<any>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }

    return this.getUserActivity(username, 'likes', page);
  }

  async getUserBookmarkedTopics(username: string, page: number = 0): Promise<DiscourseApiResponse<any>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }

    return this.getUserActivity(username, 'bookmarks', page);
  }

  async getUserSolvedTopics(username: string, page: number = 0): Promise<DiscourseApiResponse<any>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }

    // Try native endpoint first, fallback to search
    const activityResponse = await this.getUserActivity(username, 'solved', page);
    if (activityResponse.success) {
      return activityResponse;
    }

    // Fallback to search query
    const searchQuery = `in:solved author:${username}`;
    return this.search(searchQuery, {
      type: 'topic',
      limit: 20,
      order: 'created',
      period: 'all',
    });
  }

  async getUserVotes(username: string, page: number = 0): Promise<DiscourseApiResponse<any>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }

    return this.getUserActivity(username, 'votes', page);
  }

  // Moderation Actions
  async reportUser(username: string, reason: string): Promise<DiscourseApiResponse<void>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    
    // Discourse uses flag endpoint for reporting users
    // This is a simplified implementation - actual Discourse API may vary
    return this.makeRequest<void>(`/u/${encodeURIComponent(username)}/flag`, {
      method: 'POST',
      body: JSON.stringify({
        flag_type_id: 4, // User flag type
        message: SecurityValidator.sanitizeInput(reason),
      }),
    });
  }

  async blockUser(username: string): Promise<DiscourseApiResponse<void>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    
    // Discourse may use different endpoints for blocking
    // This is a placeholder implementation
    return this.makeRequest<void>(`/u/${encodeURIComponent(username)}/block`, {
      method: 'POST',
    });
  }

  async muteUser(username: string): Promise<DiscourseApiResponse<void>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    
    // Discourse may use different endpoints for muting
    // This is a placeholder implementation
    return this.makeRequest<void>(`/u/${encodeURIComponent(username)}/mute`, {
      method: 'POST',
    });
  }

  async ignoreUser(username: string): Promise<DiscourseApiResponse<void>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    
    // Discourse may use different endpoints for ignoring
    // This is a placeholder implementation
    return this.makeRequest<void>(`/u/${encodeURIComponent(username)}/ignore`, {
      method: 'POST',
    });
  }
}

// Default configuration with security validation
const defaultConfig: DiscourseConfig = {
  baseUrl: config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.fomio.app', // Use Fomio as default
};

// Log configuration status for debugging
console.log('🔧 Discourse API Configuration:', {
  baseUrl: defaultConfig.baseUrl,
  authentication: 'User API Keys',
});

// Export singleton instance
export const discourseApi = new DiscourseApiService(defaultConfig);

// Export types and service class
export { DiscourseApiService };
export default discourseApi;
