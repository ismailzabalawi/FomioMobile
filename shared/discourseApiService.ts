import { discourseApi, AppUser, Hub, Byte, Comment, SearchResult } from './discourseApi';

// Re-export everything from the main API file
export { discourseApi, AppUser, Hub, Byte, Comment, SearchResult };

// Export types for API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DiscourseApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Export the main service class
export class DiscourseApiService {
  private config: any;
  private cache: Map<string, any> = new Map();

  constructor(config: any) {
    this.config = config;
  }

  // Add missing followers and following properties to AppUser type
  private mapDiscourseUserToAppUser(discourseUser: any): AppUser {
    return {
      id: discourseUser.id.toString(),
      username: discourseUser.username,
      name: discourseUser.name || discourseUser.username,
      email: discourseUser.email || '',
      avatar: this.getAvatarUrl(discourseUser.avatar_template, 120),
      bio: discourseUser.bio_raw || '',
      followers: 0, // Not available in Discourse
      following: 0, // Not available in Discourse
      bytes: discourseUser.post_count || 0,
      comments: discourseUser.post_count || 0,
      joinedDate: `Joined ${new Date(discourseUser.created_at).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      })}`,
    };
  }

  private getAvatarUrl(template: string, size: number = 120): string {
    if (!template) return '';
    return `${this.config.baseUrl}${template.replace('{size}', size.toString())}`;
  }

  // Delegate all methods to the main API service
  async login(identifier: string, password: string): Promise<ApiResponse<AppUser>> {
    const response = await discourseApi.login(identifier, password);
    if (response.success && response.data) {
      // Map the response to AppUser
      const appUser = this.mapDiscourseUserToAppUser(response.data.user);
      return { success: true, data: appUser };
    }
    return { success: false, error: response.error };
  }

  async logout(): Promise<ApiResponse<void>> {
    return discourseApi.logout();
  }

  async createUser(userData: {
    name: string;
    username: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<AppUser>> {
    // For now, return a mock response since createUser is not implemented in discourseApi
    const mockUser = this.mapDiscourseUserToAppUser({
      id: Date.now(),
      username: userData.username,
      name: userData.name,
      email: userData.email,
      avatar_template: '',
      bio_raw: '',
      post_count: 0,
      created_at: new Date().toISOString()
    });
    return { success: true, data: mockUser };
  }

  async getCurrentUser(): Promise<ApiResponse<AppUser>> {
    const response = await discourseApi.getCurrentUser();
    if (response.success && response.data) {
      const appUser = this.mapDiscourseUserToAppUser(response.data);
      return { success: true, data: appUser };
    }
    return { success: false, error: response.error };
  }

  async getHubs(): Promise<ApiResponse<Hub[]>> {
    return discourseApi.getHubs();
  }

  async getHub(id: number): Promise<ApiResponse<Hub>> {
    return discourseApi.getHub(id);
  }

  async createHub(data: {
    name: string;
    color: string;
    textColor: string;
    description?: string;
    parentCategoryId?: number;
  }): Promise<ApiResponse<Hub>> {
    // Mock implementation - would need real Discourse API call
    const mockHub: Hub = {
      id: Date.now(),
      name: data.name,
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      description: data.description || '',
      color: data.color,
      textColor: data.textColor,
      parentId: data.parentCategoryId,
      topicsCount: 0,
      postsCount: 0,
      isSubscribed: false,
      discourseId: Date.now()
    };
    return { success: true, data: mockHub };
  }

  async getBytes(hubId?: number, page?: number): Promise<ApiResponse<Byte[]>> {
    return discourseApi.getBytes(hubId, page);
  }

  async getByte(id: number): Promise<ApiResponse<Byte>> {
    return discourseApi.getByte(id);
  }

  async createByte(data: {
    title: string;
    content: string;
    hubId: number;
  }): Promise<ApiResponse<Byte>> {
    return discourseApi.createByte(data);
  }

  async updateByte(id: number, data: {
    title?: string;
    content?: string;
  }): Promise<ApiResponse<Byte>> {
    // Mock implementation - would need real Discourse API call
    return { success: false, error: 'Update byte not implemented yet' };
  }

  async deleteByte(id: number): Promise<ApiResponse<void>> {
    // Mock implementation - would need real Discourse API call
    return { success: false, error: 'Delete byte not implemented yet' };
  }

  async likeByte(id: number): Promise<ApiResponse<void>> {
    return discourseApi.likeByte(id);
  }

  async getComments(byteId: number): Promise<ApiResponse<Comment[]>> {
    return discourseApi.getComments(byteId);
  }

  async createComment(data: {
    content: string;
    byteId: number;
    replyToPostNumber?: number;
  }): Promise<ApiResponse<Comment>> {
    return discourseApi.createComment(data);
  }

  async updateComment(id: number, content: string): Promise<ApiResponse<Comment>> {
    // Mock implementation - would need real Discourse API call
    return { success: false, error: 'Update comment not implemented yet' };
  }

  async deleteComment(id: number): Promise<ApiResponse<void>> {
    // Mock implementation - would need real Discourse API call
    return { success: false, error: 'Delete comment not implemented yet' };
  }

  async likeComment(id: number): Promise<ApiResponse<void>> {
    return discourseApi.likeComment(id);
  }

  async likePost(postId: number): Promise<DiscourseApiResponse<void>> {
    // Call the public likeByte method which internally calls likePost
    return this.likeByte(postId);
  }

  async unlikePost(postId: number): Promise<DiscourseApiResponse<void>> {
    return discourseApi.unlikePost(postId);
  }

  async bookmarkPost(postId: number): Promise<DiscourseApiResponse<void>> {
    // Mock implementation - would need real Discourse API call
    return { success: false, error: 'Bookmark not implemented yet' };
  }

  async unbookmarkPost(postId: number): Promise<DiscourseApiResponse<void>> {
    // Mock implementation - would need real Discourse API call
    return { success: false, error: 'Unbookmark not implemented yet' };
  }

  async search(query: string, filters?: {
    hubId?: number;
    order?: 'relevance' | 'latest' | 'views' | 'likes';
    limit?: number;
  }): Promise<ApiResponse<SearchResult>> {
    return discourseApi.search(query, filters);
  }
}

// Export singleton instance
export const discourseApiService = new DiscourseApiService({
  baseUrl: process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.techrebels.info',
  apiKey: process.env.EXPO_PUBLIC_DISCOURSE_API_KEY,
  apiUsername: process.env.EXPO_PUBLIC_DISCOURSE_API_USERNAME,
});

export default discourseApiService;

