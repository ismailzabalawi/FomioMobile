import type { Byte } from '@/types/byte';
import { discourseApi } from '../discourseApi';
import { extractMedia } from '@/lib/utils/media';
import { extractLinkPreview } from '@/lib/utils/linkPreview';

/**
 * Adapter to transform full Topic (from GET /t/{topic_id}.json) → Byte
 * 
 * Pure function - no async calls, no side effects
 * Maps full topic data with post_stream to complete Byte
 * 
 * @param topic - Full topic object from Discourse API
 */
export function mapTopicToFullByte(topic: any): Byte {
  // Extract first post from post_stream
  const firstPost = topic.post_stream?.posts?.[0];
  
  if (!firstPost) {
    // Fallback if post_stream is missing (shouldn't happen for full topics)
    return {
      id: topic.id,
      title: topic.title,
      author: {
        id: 0,
        username: 'unknown',
        name: 'Unknown User',
        avatar: '',
      },
      raw: '',
      cooked: topic.excerpt || '',
      createdAt: topic.created_at || new Date().toISOString(),
      updatedAt: topic.updated_at || topic.created_at || new Date().toISOString(),
      origin: 'hydrated',
      stats: {
        likes: topic.like_count || 0,
        replies: Math.max(0, (topic.posts_count || 1) - 1),
        views: topic.views,
      },
      isLiked: false,
      isBookmarked: false,
    };
  }

  // Get author from first post
  const authorId = firstPost.user_id || 0;
  const username = firstPost.username || 'unknown';
  const name = firstPost.name || username;
  const avatarTemplate = firstPost.avatar_template || '';
  const avatar = avatarTemplate ? discourseApi.getAvatarUrl(avatarTemplate, 120) : '';

  // Get engagement state from post actions_summary
  const likeAction = firstPost.actions_summary?.find((a: any) => a.id === 2); // Like action type
  const isLiked = likeAction?.acted || false;
  const likeCount = likeAction?.count || topic.like_count || 0;

  // Get bookmark state from topic details
  const isBookmarked = topic.details?.bookmarked || false;

  // Extract media from cooked HTML
  const cooked = firstPost.cooked || '';
  const media = extractMedia(cooked);
  
  // Extract link preview from cooked HTML (first onebox only)
  const linkPreview = extractLinkPreview(cooked);

  // Map category to teret
  // Discourse API returns color as hex string (e.g., "FF6B6B") - add # prefix if needed
  const categoryColor = topic.category?.color;
  const formattedColor = categoryColor 
    ? (categoryColor.startsWith('#') ? categoryColor : `#${categoryColor}`)
    : undefined;
  
  // Only create teret if we have a valid category name
  // This ensures the badge only shows when category data is available
  const teret = topic.category_id && topic.category?.name
    ? {
        id: topic.category_id,
        name: topic.category.name,
        color: formattedColor,
      }
    : undefined;

  return {
    id: topic.id,
    title: topic.title,
    author: {
      id: authorId,
      username,
      name,
      avatar,
    },
    teret,
    raw: firstPost.raw || '',
    cooked,
    createdAt: firstPost.created_at || topic.created_at || new Date().toISOString(),
    updatedAt: firstPost.updated_at || topic.updated_at || topic.created_at || new Date().toISOString(),
    origin: 'hydrated',
    media: media.length > 0 ? media : undefined,
    linkPreview,
    stats: {
      likes: likeCount,
      replies: Math.max(0, (topic.posts_count || 1) - 1),
      views: topic.views,
    },
    isLiked,
    isBookmarked,
  };
}

