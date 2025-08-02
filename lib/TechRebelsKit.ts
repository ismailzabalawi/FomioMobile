/**
 * TechRebelsKit - High-level abstraction for common Discourse operations
 * Provides clean, typed interfaces for FomioMobile app interactions
 */

import { apolloClient } from './apolloClient';
import { 
  GET_HOT_BYTES, 
  GET_HUBS, 
  GET_BYTE_DETAILS, 
  GET_USER_PROFILE, 
  GET_CURRENT_USER,
  SEARCH_CONTENT,
  CREATE_BYTE, 
  CREATE_COMMENT, 
  LIKE_POST, 
  UNLIKE_POST, 
  BOOKMARK_POST 
} from '@/graphql/queries';

// Type definitions for TechRebelsKit
export interface TechRebelsUser {
  id: number;
  username: string;
  name?: string;
  avatarTemplate: string;
  title?: string;
  badgeCount: number;
  trustLevel: number;
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
  joinedAt: string;
  lastSeenAt?: string;
  stats: {
    topicCount: number;
    postCount: number;
    likesGiven: number;
    likesReceived: number;
    daysVisited: number;
  };
}

export interface TechRebelsHub {
  id: number;
  name: string;
  slug: string;
  color: string;
  textColor: string;
  description: string;
  topicCount: number;
  postCount: number;
  canEdit: boolean;
  readRestricted: boolean;
  subcategoryIds: number[];
}

export interface TechRebelsByte {
  id: number;
  title: string;
  excerpt?: string;
  content?: string;
  authorUsername: string;
  authorAvatar: string;
  createdAt: string;
  updatedAt?: string;
  postsCount: number;
  views: number;
  likeCount: number;
  categoryId: number;
  tags: string[];
  isPinned: boolean;
  isClosed: boolean;
  isArchived: boolean;
  imageUrl?: string;
}

export interface TechRebelsComment {
  id: number;
  content: string;
  rawContent: string;
  authorUsername: string;
  authorAvatar: string;
  createdAt: string;
  updatedAt?: string;
  postNumber: number;
  replyToPostNumber?: number;
  replyCount: number;
  likeCount: number;
  isYours: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isBookmarked: boolean;
  topicId: number;
}

export interface TechRebelsSearchResult {
  topics: TechRebelsByte[];
  posts: TechRebelsComment[];
  users: TechRebelsUser[];
  categories: TechRebelsHub[];
}

/**
 * TechRebelsKit - Main API abstraction class
 */
export class TechRebelsKit {
  
  /**
   * Get hot bytes (latest topics) from the community
   */
  static async getHotBytes(): Promise<TechRebelsByte[]> {
    try {
      const result = await apolloClient.query({
        query: GET_HOT_BYTES,
        fetchPolicy: 'cache-first'
      });

      const topics = result.data?.hotBytes?.topic_list?.topics || [];
      
      return topics.map((topic: any): TechRebelsByte => ({
        id: topic.id,
        title: topic.title,
        excerpt: topic.excerpt,
        authorUsername: topic.last_poster_username,
        authorAvatar: this.buildAvatarUrl(topic.last_poster_username),
        createdAt: topic.created_at,
        postsCount: topic.posts_count || 0,
        views: topic.views || 0,
        likeCount: topic.like_count || 0,
        categoryId: topic.category_id,
        tags: topic.tags || [],
        isPinned: topic.pinned || false,
        isClosed: topic.closed || false,
        isArchived: topic.archived || false,
        imageUrl: topic.image_url
      }));
    } catch (error) {
      console.error('❌ TechRebelsKit.getHotBytes failed:', error);
      throw new Error('Failed to fetch hot bytes');
    }
  }

  /**
   * Get all hubs (categories) from the community
   */
  static async getHubs(): Promise<TechRebelsHub[]> {
    try {
      const result = await apolloClient.query({
        query: GET_HUBS,
        fetchPolicy: 'cache-first'
      });

      const categories = result.data?.hubs?.category_list?.categories || [];
      
      return categories.map((category: any): TechRebelsHub => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        color: category.color,
        textColor: category.text_color,
        description: category.description_text || category.description || '',
        topicCount: category.topic_count || 0,
        postCount: category.post_count || 0,
        canEdit: category.can_edit || false,
        readRestricted: category.read_restricted || false,
        subcategoryIds: category.subcategory_ids || []
      }));
    } catch (error) {
      console.error('❌ TechRebelsKit.getHubs failed:', error);
      throw new Error('Failed to fetch hubs');
    }
  }

  /**
   * Get detailed information about a specific byte (topic)
   */
  static async getByteDetails(topicId: number): Promise<{ byte: TechRebelsByte; comments: TechRebelsComment[] }> {
    try {
      const result = await apolloClient.query({
        query: GET_BYTE_DETAILS,
        variables: { topicId },
        fetchPolicy: 'cache-first'
      });

      const byteData = result.data?.byte;
      if (!byteData) {
        throw new Error('Byte not found');
      }

      const byte: TechRebelsByte = {
        id: byteData.id,
        title: byteData.title,
        authorUsername: byteData.details?.created_by?.username || '',
        authorAvatar: this.buildAvatarUrl(byteData.details?.created_by?.username),
        createdAt: byteData.created_at,
        postsCount: byteData.posts_count || 0,
        views: byteData.views || 0,
        likeCount: byteData.like_count || 0,
        categoryId: byteData.category_id,
        tags: byteData.tags || [],
        isPinned: byteData.pinned || false,
        isClosed: byteData.closed || false,
        isArchived: byteData.archived || false
      };

      const comments: TechRebelsComment[] = (byteData.post_stream?.posts || []).map((post: any): TechRebelsComment => ({
        id: post.id,
        content: post.cooked || post.raw,
        rawContent: post.raw,
        authorUsername: post.username,
        authorAvatar: this.buildAvatarUrl(post.username, post.avatar_template),
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        postNumber: post.post_number,
        replyToPostNumber: post.reply_to_post_number,
        replyCount: post.reply_count || 0,
        likeCount: this.getLikeCount(post.actions_summary),
        isYours: post.yours || false,
        canEdit: post.can_edit || false,
        canDelete: post.can_delete || false,
        isBookmarked: post.bookmarked || false,
        topicId: post.topic_id
      }));

      return { byte, comments };
    } catch (error) {
      console.error('❌ TechRebelsKit.getByteDetails failed:', error);
      throw new Error('Failed to fetch byte details');
    }
  }

  /**
   * Create a new byte (topic) in a hub
   */
  static async createByte(title: string, content: string, hubId: number): Promise<TechRebelsByte> {
    try {
      const result = await apolloClient.mutate({
        mutation: CREATE_BYTE,
        variables: {
          title,
          raw: content,
          category: hubId
        },
        refetchQueries: [{ query: GET_HOT_BYTES }]
      });

      const createdByte = result.data?.createByte;
      if (!createdByte) {
        throw new Error('Failed to create byte');
      }

      return {
        id: createdByte.topic_id,
        title,
        content,
        authorUsername: createdByte.display_username || createdByte.username,
        authorAvatar: this.buildAvatarUrl(createdByte.username),
        createdAt: new Date().toISOString(),
        postsCount: 1,
        views: 0,
        likeCount: 0,
        categoryId: hubId,
        tags: [],
        isPinned: false,
        isClosed: false,
        isArchived: false
      };
    } catch (error) {
      console.error('❌ TechRebelsKit.createByte failed:', error);
      throw new Error('Failed to create byte');
    }
  }

  /**
   * Create a comment (reply) on a byte
   */
  static async createComment(byteId: number, content: string, replyToPostNumber?: number): Promise<TechRebelsComment> {
    try {
      const result = await apolloClient.mutate({
        mutation: CREATE_COMMENT,
        variables: {
          raw: content,
          topic_id: byteId,
          reply_to_post_number: replyToPostNumber
        },
        refetchQueries: [
          { query: GET_BYTE_DETAILS, variables: { topicId: byteId } }
        ]
      });

      const createdComment = result.data?.createComment;
      if (!createdComment) {
        throw new Error('Failed to create comment');
      }

      return {
        id: createdComment.id,
        content: createdComment.raw,
        rawContent: createdComment.raw,
        authorUsername: createdComment.username,
        authorAvatar: this.buildAvatarUrl(createdComment.username, createdComment.avatar_template),
        createdAt: createdComment.created_at,
        postNumber: createdComment.post_number,
        replyToPostNumber: createdComment.reply_to_post_number,
        replyCount: createdComment.reply_count || 0,
        likeCount: this.getLikeCount(createdComment.actions_summary),
        isYours: createdComment.yours || false,
        canEdit: createdComment.can_edit || false,
        canDelete: createdComment.can_delete || false,
        isBookmarked: createdComment.bookmarked || false,
        topicId: createdComment.topic_id
      };
    } catch (error) {
      console.error('❌ TechRebelsKit.createComment failed:', error);
      throw new Error('Failed to create comment');
    }
  }

  /**
   * Like a post (byte or comment)
   */
  static async likePost(postId: number): Promise<boolean> {
    try {
      const result = await apolloClient.mutate({
        mutation: LIKE_POST,
        variables: { postId }
      });

      return !!result.data?.likePost;
    } catch (error) {
      console.error('❌ TechRebelsKit.likePost failed:', error);
      throw new Error('Failed to like post');
    }
  }

  /**
   * Unlike a post (byte or comment)
   */
  static async unlikePost(postId: number): Promise<boolean> {
    try {
      const result = await apolloClient.mutate({
        mutation: UNLIKE_POST,
        variables: { postId }
      });

      return result.data?.unlikePost?.success || false;
    } catch (error) {
      console.error('❌ TechRebelsKit.unlikePost failed:', error);
      throw new Error('Failed to unlike post');
    }
  }

  /**
   * Bookmark a post
   */
  static async bookmarkPost(postId: number): Promise<boolean> {
    try {
      const result = await apolloClient.mutate({
        mutation: BOOKMARK_POST,
        variables: { postId }
      });

      return !!result.data?.bookmarkPost;
    } catch (error) {
      console.error('❌ TechRebelsKit.bookmarkPost failed:', error);
      throw new Error('Failed to bookmark post');
    }
  }

  /**
   * Search across all content in the community
   */
  static async searchContent(query: string): Promise<TechRebelsSearchResult> {
    try {
      const result = await apolloClient.query({
        query: SEARCH_CONTENT,
        variables: { query },
        fetchPolicy: 'cache-first'
      });

      const searchData = result.data?.searchResults;
      
      return {
        topics: (searchData?.topics || []).map((topic: any): TechRebelsByte => ({
          id: topic.id,
          title: topic.title,
          excerpt: topic.excerpt,
          authorUsername: '', // Not provided in search results
          authorAvatar: '',
          createdAt: topic.created_at,
          postsCount: topic.posts_count || 0,
          views: 0, // Not provided in search results
          likeCount: topic.like_count || 0,
          categoryId: topic.category_id,
          tags: topic.tags || [],
          isPinned: false,
          isClosed: false,
          isArchived: false
        })),
        posts: (searchData?.posts || []).map((post: any): TechRebelsComment => ({
          id: post.id,
          content: post.excerpt || '',
          rawContent: post.excerpt || '',
          authorUsername: post.username,
          authorAvatar: this.buildAvatarUrl(post.username, post.avatar_template),
          createdAt: post.created_at,
          postNumber: post.post_number,
          replyCount: 0,
          likeCount: post.like_count || 0,
          isYours: false,
          canEdit: false,
          canDelete: false,
          isBookmarked: false,
          topicId: post.topic_id
        })),
        users: (searchData?.users || []).map((user: any): TechRebelsUser => ({
          id: user.id,
          username: user.username,
          name: user.name,
          avatarTemplate: user.avatar_template,
          badgeCount: 0,
          trustLevel: 0,
          isAdmin: false,
          isModerator: false,
          isStaff: false,
          joinedAt: '',
          stats: {
            topicCount: 0,
            postCount: 0,
            likesGiven: 0,
            likesReceived: 0,
            daysVisited: 0
          }
        })),
        categories: (searchData?.categories || []).map((category: any): TechRebelsHub => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          color: category.color,
          textColor: '',
          description: '',
          topicCount: category.topic_count || 0,
          postCount: 0,
          canEdit: false,
          readRestricted: false,
          subcategoryIds: []
        }))
      };
    } catch (error) {
      console.error('❌ TechRebelsKit.searchContent failed:', error);
      throw new Error('Failed to search content');
    }
  }

  /**
   * Get current authenticated user information
   */
  static async getCurrentUser(): Promise<TechRebelsUser | null> {
    try {
      const result = await apolloClient.query({
        query: GET_CURRENT_USER,
        fetchPolicy: 'cache-first'
      });

      const userData = result.data?.currentUser?.current_user;
      if (!userData) {
        return null;
      }

      return {
        id: userData.id,
        username: userData.username,
        name: userData.name,
        avatarTemplate: userData.avatar_template,
        title: userData.title,
        badgeCount: userData.badge_count || 0,
        trustLevel: userData.trust_level || 0,
        isAdmin: userData.admin || false,
        isModerator: userData.moderator || false,
        isStaff: userData.staff || false,
        joinedAt: '', // Not provided in current user endpoint
        stats: {
          topicCount: 0, // Not provided in current user endpoint
          postCount: 0,
          likesGiven: 0,
          likesReceived: 0,
          daysVisited: 0
        }
      };
    } catch (error) {
      console.error('❌ TechRebelsKit.getCurrentUser failed:', error);
      return null;
    }
  }

  /**
   * Get detailed user profile information
   */
  static async getUserProfile(username: string): Promise<TechRebelsUser | null> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_PROFILE,
        variables: { username },
        fetchPolicy: 'cache-first'
      });

      const userData = result.data?.userProfile?.user;
      if (!userData) {
        return null;
      }

      return {
        id: userData.id,
        username: userData.username,
        name: userData.name,
        avatarTemplate: userData.avatar_template,
        title: userData.title,
        badgeCount: userData.badge_count || 0,
        trustLevel: 0, // Not provided in user profile endpoint
        isAdmin: false, // Not provided in user profile endpoint
        isModerator: false,
        isStaff: false,
        joinedAt: userData.created_at,
        lastSeenAt: userData.last_seen_at,
        stats: {
          topicCount: userData.stats?.topic_count || 0,
          postCount: userData.stats?.post_count || 0,
          likesGiven: userData.stats?.likes_given || 0,
          likesReceived: userData.stats?.likes_received || 0,
          daysVisited: userData.stats?.days_visited || 0
        }
      };
    } catch (error) {
      console.error('❌ TechRebelsKit.getUserProfile failed:', error);
      return null;
    }
  }

  // Helper methods

  /**
   * Build avatar URL from username and template
   */
  private static buildAvatarUrl(username?: string, avatarTemplate?: string): string {
    if (!username) return '';
    
    const baseUrl = process.env.EXPO_PUBLIC_DISCOURSE_BASE_URL || 'https://meta.techrebels.info';
    
    if (avatarTemplate) {
      return `${baseUrl}${avatarTemplate.replace('{size}', '120')}`;
    }
    
    // Fallback to default avatar
    return `${baseUrl}/letter_avatar_proxy/v4/${encodeURIComponent(username)}/120/2.png`;
  }

  /**
   * Extract like count from actions summary
   */
  private static getLikeCount(actionsSummary?: any[]): number {
    if (!actionsSummary) return 0;
    
    const likeAction = actionsSummary.find(action => action.id === 2); // Like action ID is 2
    return likeAction?.count || 0;
  }

  /**
   * Check if Apollo Client is properly configured
   */
  static isConfigured(): boolean {
    const apiKey = process.env.EXPO_PUBLIC_DISCOURSE_API_KEY;
    const apiUsername = process.env.EXPO_PUBLIC_DISCOURSE_API_USERNAME;
    return !!(apiKey && apiUsername);
  }

  /**
   * Get configuration status for debugging
   */
  static getConfigStatus() {
    return {
      baseUrl: process.env.EXPO_PUBLIC_DISCOURSE_BASE_URL || 'https://meta.techrebels.info',
      hasApiKey: !!process.env.EXPO_PUBLIC_DISCOURSE_API_KEY,
      hasApiUsername: !!process.env.EXPO_PUBLIC_DISCOURSE_API_USERNAME,
      isConfigured: this.isConfigured()
    };
  }
}

// Export default instance
export default TechRebelsKit;

