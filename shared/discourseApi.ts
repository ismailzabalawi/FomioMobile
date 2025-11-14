// Import Constants for Expo config
import Constants from 'expo-constants';
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
        const cachedData = this.getCachedData<T>(cacheKey);
        if (cachedData) {
          return {
            success: true,
            data: cachedData,
          };
        }
      }
      
      console.log(`🌐 Making request to: ${url} (attempt ${4 - retries}/3)`);
      
      // Security headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'FomioMobile/1.0',
        ...(options.headers as Record<string, string> | undefined),
      };

      // Authentication: Use User API Keys (delegated auth with RSA)
      try {
        const { authHeaders: getAuthHeaders } = require('../lib/auth');
        const authHeaders = await getAuthHeaders();
        
        if (authHeaders['User-Api-Key']) {
          Object.assign(headers, authHeaders);
          console.log('🔑 Using User API Key for authentication');
        } else {
          console.log('⚠️ User API Key not found, request may fail');
        }
      } catch (error) {
        console.warn('Failed to load auth headers', error);
      }

      // Sanitize request body if present
      let sanitizedBody = options.body;
      if (options.body && typeof options.body === 'string') {
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
          console.error(`❌ HTTP Error ${response.status}:`, errorData);
          
          // Handle 401/403 (unauthorized/forbidden) - API key expired or invalid
          if (response.status === 401 || response.status === 403) {
            console.log('🔒 API key expired or invalid (401/403), clearing authentication');
            
            // Clear User API Key
            try {
              const UserApiKeyManager = require('./userApiKeyManager').UserApiKeyManager;
              await UserApiKeyManager.clearApiKey();
              console.log('🔑 User API Key cleared due to 401/403');
            } catch (error) {
              console.warn('Failed to clear User API Key', error);
            }
            
            return {
              success: false,
              error: 'Authorization expired. Please authorize the app again.',
              errors: errorData.errors,
              status: response.status, // Include status for error handling
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

        const data = await response.json();
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

  private getCachedData<T>(cacheKey: string): T | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📦 Using cached data for: ${cacheKey}`);
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
    // Only cache GET requests and specific endpoints
    const cacheableEndpoints = [
      '/categories.json',
      '/site.json',
      '/session/current.json',
      '/notifications.json',
    ];
    
    return method === 'GET' && cacheableEndpoints.some(ep => endpoint.includes(ep));
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
    
    // Discourse API returns { current_user: {...} } not the user directly
    if (response.success && response.data) {
      const userData = response.data.current_user || response.data;
      
      // Debug logging to understand the response structure
      console.log('🔍 getCurrentUser response:', {
        hasId: !!userData.id,
        id: userData.id,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        avatar_template: userData.avatar_template
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
    return this.makeRequest<DiscourseUser>(`/users/${encodeURIComponent(username)}.json`);
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
    
    return this.makeRequest<DiscourseUser>(`/users/${encodeURIComponent(username)}`, {
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

    const formData = new FormData();
    
    if ('uri' in imageFile) {
      // React Native: append as object with uri, type, name
      formData.append('upload', {
        uri: imageFile.uri,
        type: fileType,
        name: imageFile.name || 'avatar.jpg',
      } as any);
    } else {
      // Browser: append File object directly
      formData.append('upload', imageFile);
    }
    
    formData.append('type', 'avatar');

    return this.makeRequest<any>(`/users/${encodeURIComponent(username)}/preferences/avatar/pick`, {
      method: 'PUT',
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

  async getTopic(topicId: number): Promise<DiscourseApiResponse<any>> {
    return this.makeRequest<any>(`/t/${topicId}.json`);
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
    return this.makeRequest<void>(`/notifications/${notificationId}/read.json`, {
      method: 'POST',
    });
  }

  async markAllNotificationsAsRead(): Promise<DiscourseApiResponse<void>> {
    return this.makeRequest<void>('/notifications/read.json', {
      method: 'POST',
    });
  }

  // User and Category Methods
  async getUser(userId: number): Promise<DiscourseApiResponse<DiscourseUser>> {
    return this.makeRequest<DiscourseUser>(`/admin/users/${userId}.json`);
  }

  async getCategory(categoryId: number): Promise<DiscourseApiResponse<any>> {
    return this.makeRequest<any>(`/c/${categoryId}/show.json`);
  }

  async getCategories(): Promise<DiscourseApiResponse<any>> {
    return this.makeRequest<any>('/categories.json');
  }

  // Like/Bookmark Actions
  async unlikePost(postId: number): Promise<DiscourseApiResponse<any>> {
    return this.makeRequest<any>(`/post_actions/${postId}`, {
      method: 'DELETE',
      body: JSON.stringify({
        post_action_type_id: 2, // Like action type
      }),
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
  } = {}): Promise<DiscourseApiResponse<any>> {
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
    
    return this.makeRequest<any>(endpoint);
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
    return {
      id: topic.id,
      title: topic.title,
      excerpt: topic.excerpt,
      content: topic.post_stream?.posts?.[0]?.cooked || '', // First post content
      rawContent: topic.post_stream?.posts?.[0]?.raw || '',
      hubId: topic.category_id,
      hubName: topic.category?.name || '',
      author: this.mapDiscourseUserToAppUser(topic.details?.created_by || topic.last_poster),
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
      isLiked: topic.liked || false,
      likeCount: topic.like_count || 0,
      viewCount: topic.views || 0,
      tags: topic.tags || [],
      discourseId: topic.id
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

    const appUser = {
      id: userId ? userId.toString() : '0',
      name: name || username || 'Unknown User',
      username: username || 'unknown',
      email: email || '',
      avatar: this.getAvatarUrl(discourseUser.avatar_template, 120),
      bio: discourseUser.bio_raw || '',
      followers: 0, // Not available in Discourse
      following: 0, // Not available in Discourse
      bytes: discourseUser.post_count || 0,
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
      const response = await this.makeRequest<any>('/posts.json', {
        method: 'POST',
        body: JSON.stringify({
          raw: data.content,
          topic_id: data.byteId,
          reply_to_post_number: data.replyToPostNumber
        })
      });

      if (response.success && response.data?.id) {
        // Fetch the topic to get the new post
        const topicResponse = await this.makeRequest<any>(`/t/${data.byteId}.json`);
        if (topicResponse.success && topicResponse.data) {
          const newPost = topicResponse.data.post_stream.posts.find((p: any) => p.id === response.data.id);
          if (newPost) {
            const comment = this.mapPostToComment(newPost, topicResponse.data);
            return {
              success: true,
              data: comment
            };
          }
        }
      }
      return { success: false, error: 'Failed to create comment' };
    } catch (error) {
      return { success: false, error: 'Network error creating comment' };
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
            edit_reason: 'Updated via FomioMobile'
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
}

// Default configuration with security validation
const defaultConfig: DiscourseConfig = {
  baseUrl: config.DISCOURSE_BASE_URL || process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.techrebels.info', // Use TechRebels as default
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

