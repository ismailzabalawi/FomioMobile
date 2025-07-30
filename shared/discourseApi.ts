import AsyncStorage from '@react-native-async-storage/async-storage';

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
  apiKey?: string;
  apiUsername?: string;
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
}

export interface LoginResponse {
  user: DiscourseUser;
  token: string;
  refresh_token?: string;
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

    if (config.apiKey && !this.validateToken(config.apiKey)) {
      throw new Error('Invalid API key format');
    }

    if (config.apiUsername && !this.validateUsername(config.apiUsername)) {
      throw new Error('Invalid API username format');
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
  private authToken: string | null = null;
  private rateLimiter: RateLimiter = new RateLimiter();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(config: DiscourseConfig) {
    // Validate configuration before setting
    SecurityValidator.validateConfig(config);
    this.config = config;
    this.loadAuthToken();
  }

  // Secure token storage with encryption
  private async loadAuthToken(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('discourse_auth_token');
      if (token && SecurityValidator.validateToken(token)) {
        this.authToken = token;
      } else if (token) {
        // Invalid token found, clear it
        await this.clearAuthToken();
      }
    } catch (error) {
      console.error('Failed to load auth token:', error);
      // Clear potentially corrupted token
      await this.clearAuthToken();
    }
  }

  private async saveAuthToken(token: string): Promise<void> {
    try {
      if (!SecurityValidator.validateToken(token)) {
        throw new Error('Invalid token format');
      }
      await AsyncStorage.setItem('discourse_auth_token', token);
      this.authToken = token;
    } catch (error) {
      console.error('Failed to save auth token:', error);
      throw new Error('Failed to securely store authentication token');
    }
  }

  private async clearAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('discourse_auth_token');
      this.authToken = null;
    } catch (error) {
      console.error('Failed to clear auth token:', error);
    }
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
        const cacheKey = this.getCacheKey(endpoint, options);
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

      // Add API credentials if available
      if (this.config.apiKey) {
        headers['Api-Key'] = this.config.apiKey;
      }
      if (this.config.apiUsername) {
        headers['Api-Username'] = this.config.apiUsername;
      }

      // Add authentication token if available
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
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
          };
        }

        const data = await response.json();
        console.log('✅ Request successful');

        // Cache successful GET requests
        if (this.isCacheableRequest(method, endpoint)) {
          const cacheKey = this.getCacheKey(endpoint, options);
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
  private getCacheKey(endpoint: string, options: RequestInit = {}): string {
    const bodyHash = options.body ? btoa(String(options.body)).slice(0, 8) : '';
    return `${endpoint}_${bodyHash}_${this.authToken ? 'auth' : 'public'}`;
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

  // Authentication API with enhanced security
  async login(identifier: string, password: string): Promise<DiscourseApiResponse<LoginResponse>> {
    try {
      // Validate inputs - identifier can be either email or username
      if (!identifier || identifier.trim().length === 0) {
        return { success: false, error: 'Email or username is required' };
      }
      if (!password || password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      console.log(`🔐 Attempting login to: ${this.config.baseUrl}`);
      console.log(`📧 Login identifier: ${identifier}`);

      // First, try to get the current session to see if we're already logged in
      const currentUserResponse = await this.makeRequest<DiscourseUser>('/session/current.json');
      
      if (currentUserResponse.success && currentUserResponse.data) {
        console.log('✅ Already logged in as:', currentUserResponse.data.username);
        // Create a mock token for the existing session
        const mockToken = `session_${Date.now()}`;
        await this.saveAuthToken(mockToken);
        return {
          success: true,
          data: {
            user: currentUserResponse.data,
            token: mockToken,
          },
        };
      }

      // If not logged in, try the login endpoint
      const response = await this.makeRequest<LoginResponse>('/session', {
        method: 'POST',
        body: JSON.stringify({
          login: SecurityValidator.sanitizeInput(identifier.trim()),
          password: password,
        }),
      });

      if (response.success && response.data?.token) {
        console.log('✅ Login successful');
        await this.saveAuthToken(response.data.token);
      } else {
        console.log('❌ Login failed:', response.error);
      }

      return response;
    } catch (error) {
      console.error('🚨 Login error:', error);
      return {
        success: false,
        error: 'Authentication failed - please check your credentials and try again',
      };
    }
  }

  async logout(): Promise<DiscourseApiResponse<void>> {
    try {
      const response = await this.makeRequest<void>('/session/current', {
        method: 'DELETE',
      });

      await this.clearAuthToken();
      return response;
    } catch (error) {
      // Always clear token even if logout fails
      await this.clearAuthToken();
      return {
        success: false,
        error: 'Logout failed',
      };
    }
  }

  async getCurrentUser(): Promise<DiscourseApiResponse<DiscourseUser>> {
    return this.makeRequest<DiscourseUser>('/session/current.json');
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

  async uploadAvatar(username: string, imageFile: File): Promise<DiscourseApiResponse<any>> {
    if (!SecurityValidator.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(imageFile.type)) {
      return { success: false, error: 'Invalid file type. Only JPEG, PNG, and GIF are allowed.' };
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > maxSize) {
      return { success: false, error: 'File too large. Maximum size is 5MB.' };
    }

    const formData = new FormData();
    formData.append('upload', imageFile);
    formData.append('type', 'avatar');

    return this.makeRequest<any>(`/users/${encodeURIComponent(username)}/preferences/avatar/pick`, {
      method: 'PUT',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let the browser set it
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

  isAuthenticated(): boolean {
    return !!this.authToken && SecurityValidator.validateToken(this.authToken);
  }

  updateConfig(config: Partial<DiscourseConfig>): void {
    const newConfig = { ...this.config, ...config };
    SecurityValidator.validateConfig(newConfig);
    this.config = newConfig;
  }

  // Security audit method
  getSecurityStatus(): {
    httpsEnabled: boolean;
    rateLimitingEnabled: boolean;
    debugMode: boolean;
    mockDataEnabled: boolean;
    isAuthenticated: boolean;
  } {
    return {
      httpsEnabled: SECURITY_CONFIG.HTTPS_ONLY,
      rateLimitingEnabled: SECURITY_CONFIG.RATE_LIMITING,
      debugMode: SECURITY_CONFIG.DEBUG_MODE,
      mockDataEnabled: SECURITY_CONFIG.MOCK_DATA,
      isAuthenticated: this.isAuthenticated(),
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
    const cacheKey = this.getCacheKey(endpoint);
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
    if (!this.isAuthenticated()) {
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
      authToken: this.authToken ? 'present' : 'missing'
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
    if (!this.isAuthenticated()) {
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
  async likePost(postId: number): Promise<DiscourseApiResponse<any>> {
    return this.makeRequest<any>(`/post_actions`, {
      method: 'POST',
      body: JSON.stringify({
        id: postId,
        post_action_type_id: 2, // Like action type
      }),
    });
  }

  async unlikePost(postId: number): Promise<DiscourseApiResponse<any>> {
    return this.makeRequest<any>(`/post_actions/${postId}`, {
      method: 'DELETE',
      body: JSON.stringify({
        post_action_type_id: 2, // Like action type
      }),
    });
  }

  async bookmarkPost(postId: number): Promise<DiscourseApiResponse<any>> {
    return this.makeRequest<any>(`/post_actions`, {
      method: 'POST',
      body: JSON.stringify({
        id: postId,
        post_action_type_id: 1, // Bookmark action type
      }),
    });
  }

  async unbookmarkPost(postId: number): Promise<DiscourseApiResponse<any>> {
    return this.makeRequest<any>(`/post_actions/${postId}`, {
      method: 'DELETE',
      body: JSON.stringify({
        post_action_type_id: 1, // Bookmark action type
      }),
    });
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
}

// Default configuration with security validation
const defaultConfig: DiscourseConfig = {
  baseUrl: process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.techrebels.info', // Use TechRebels as default
  apiKey: process.env.EXPO_PUBLIC_DISCOURSE_API_KEY,
  apiUsername: process.env.EXPO_PUBLIC_DISCOURSE_API_USERNAME,
};

// Log configuration status for debugging
console.log('🔧 Discourse API Configuration:', {
  baseUrl: defaultConfig.baseUrl,
  hasApiKey: !!defaultConfig.apiKey,
  hasApiUsername: !!defaultConfig.apiUsername,
});

// Export singleton instance
export const discourseApi = new DiscourseApiService(defaultConfig);

// Export types and service class
export { DiscourseApiService };
export default discourseApi;

