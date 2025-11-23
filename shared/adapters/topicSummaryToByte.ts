import type { Byte } from '@/types/byte';
import { discourseApi } from '../discourseApi';

/**
 * Adapter to transform Topic summary (from /latest.json) → Byte
 * 
 * Pure function - no async calls, no side effects
 * Simple, direct mapping from Discourse API response
 * 
 * @param topic - Topic object from Discourse /latest.json response
 */
export function topicSummaryToByte(topic: any): Byte {
  // Get author ID from posters array (original poster)
  const authorId = topic.posters?.[0]?.user_id ?? 0;
  
  // Get author info from topic fields
  // Discourse /latest.json provides: last_poster_username, last_poster_avatar_template
  const username = topic.last_poster_username ?? 'unknown';
  const avatarTemplate = topic.last_poster_avatar_template ?? '';
  const avatar = avatarTemplate ? discourseApi.getAvatarUrl(avatarTemplate, 120) : '';

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

  // Debug logging to diagnose category badge issues
  if (__DEV__) {
    console.log('🔍 topicSummaryToByte: Teret creation', {
      topicId: topic.id,
      categoryId: topic.category_id,
      hasCategory: !!topic.category,
      categoryName: topic.category?.name,
      teretCreated: !!teret,
      teretName: teret?.name,
      teretColor: teret?.color,
    });
  }

  // Don't use excerpt - summaries should only show title, not body content
  // Full content will be loaded when user taps to view detail page
  const cooked = '';

  return {
    id: topic.id,
    title: topic.title,
    author: {
      id: authorId,
      username,
      name: username, // Discourse doesn't send display name in summary
      avatar,
    },
    teret,
    raw: '', // Summaries don't have raw markdown
    cooked, // Empty for summaries - only title is shown
    createdAt: topic.created_at || new Date().toISOString(),
    updatedAt: topic.last_posted_at || topic.created_at || new Date().toISOString(),
    origin: 'summary', // Always summary from /latest.json
    media: undefined, // Summaries don't include media
    linkPreview: undefined,
    stats: {
      likes: topic.like_count || 0,
      replies: topic.reply_count || Math.max(0, (topic.posts_count || 1) - 1),
      views: topic.views,
    },
    isLiked: false, // Summary doesn't include engagement state
    isBookmarked: false, // Summary doesn't include bookmark state
  };
}

