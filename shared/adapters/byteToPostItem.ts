import type { Byte } from '@/types/byte';
import type { Comment } from '@/shared/discourseApi';
import { PostItem } from '@/components/profile/ProfilePostList';
import { discourseApi } from '../discourseApi';

/**
 * Transform Byte object (from search API) to PostItem format
 */
export function byteToPostItem(byte: Byte): PostItem {
  const byteId = typeof byte.id === 'string' ? parseInt(byte.id, 10) : byte.id;
  
  return {
    id: byteId,
    title: byte.title || 'Untitled',
    hubName: byte.hub?.name || 'Uncategorized',
    teretName: byte.teret?.name,
    author: {
      name: byte.author.name || byte.author.username || 'Unknown',
      avatar: byte.author.avatar || '',
    },
    replyCount: byte.stats.replies || 0,
    likeCount: byte.stats.likes || 0,
    createdAt: byte.createdAt,
    lastPostedAt: byte.updatedAt || byte.createdAt,
    isBookmarked: byte.isBookmarked,
    hasMedia: !!(byte.media && byte.media.length > 0),
    coverImage: byte.media?.[0], // Use first media item as cover
    slug: `t/${byteId}`,
  };
}

/**
 * Transform Comment object (from search API) to PostItem format
 */
export function commentToPostItem(comment: Comment): PostItem {
  // Use topicId from comment (byteId may not exist on Comment type)
  const topicId = (comment as any).byteId ?? (comment as any).topicId ?? (comment as any).topic_id ?? 0;
  const byteId = typeof topicId === 'string' ? parseInt(topicId, 10) : topicId;
  
  return {
    id: byteId, // Use topic ID for navigation
    title: comment.byteTitle || 'Reply',
    hubName: 'Uncategorized', // Comments don't have category info in search results
    author: {
      name: comment.author.name || comment.author.username || 'Unknown',
      avatar: comment.author.avatar || '',
    },
    replyCount: 0, // Not applicable for individual replies
    likeCount: comment.likeCount || 0,
    createdAt: comment.createdAt,
    lastPostedAt: comment.updatedAt || comment.createdAt,
    isBookmarked: false,
    hasMedia: false,
    slug: `t/${byteId}`,
  };
}

/**
 * Transform raw Discourse topic/user_action to PostItem format
 * Used for activity endpoints that return raw Discourse data
 */
export function discourseTopicToPostItem(topic: any, discourseApiInstance: typeof discourseApi): PostItem {
  const topicId = typeof topic.id === 'string' ? parseInt(topic.id, 10) : topic.id;
  
  // Extract author info - Discourse topics can have author in multiple places:
  // 1. topic.user (from activity endpoints)
  // 2. topic.posters array (from topic list endpoints)
  // 3. topic.username (fallback)
  let authorName = 'Unknown';
  let authorAvatar = '';
  
  if (topic.user) {
    // From activity endpoints
    authorName = topic.user.name || topic.user.username || 'Unknown';
    authorAvatar = topic.user.avatar_template
      ? discourseApiInstance.getAvatarUrl(topic.user.avatar_template, 120)
      : topic.user.avatar || '';
  } else if (topic.posters && topic.posters.length > 0) {
    // From topic list endpoints - find original poster
    const creator = topic.posters.find((poster: any) => 
      poster.description?.includes('Original Poster') || poster.extras?.includes('single')
    ) || topic.posters[0];
    
    if (creator?.user) {
      authorName = creator.user.name || creator.user.username || 'Unknown';
      authorAvatar = creator.user.avatar_template
        ? discourseApiInstance.getAvatarUrl(creator.user.avatar_template, 120)
        : '';
    }
  } else if (topic.username) {
    // Fallback
    authorName = topic.username;
  }
  
  // Extract category info
  const categoryName = topic.category?.name || 
    (topic.category_id ? 'Uncategorized' : 'Uncategorized');
  
  return {
    id: topicId,
    title: topic.title || topic.fancy_title || 'Untitled',
    hubName: categoryName,
    teretName: topic.category?.slug,
    author: {
      name: authorName,
      avatar: authorAvatar,
    },
    replyCount: topic.reply_count || 0,
    likeCount: topic.like_count || 0,
    createdAt: topic.created_at || topic.created_at_ago || new Date().toISOString(),
    lastPostedAt: topic.last_posted_at || topic.last_posted_at_ago || topic.created_at,
    isBookmarked: topic.bookmarked || false,
    hasMedia: !!(topic.image_url || topic.thumbnails || topic.excerpt?.match(/<img/)),
    coverImage: topic.image_url || undefined,
    slug: topic.slug ? `t/${topic.slug}/${topicId}` : `t/${topicId}`,
  };
}

