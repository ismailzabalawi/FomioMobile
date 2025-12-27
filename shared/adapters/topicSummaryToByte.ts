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
  // Extract original poster from posters array
  // Try to find poster marked as "Original Poster" or use first poster
  const originalPoster = topic.posters?.find((poster: any) => 
    poster.description?.includes('Original Poster') || 
    poster.extras?.includes('single') ||
    poster.description?.includes('Creator')
  ) || topic.posters?.[0];
  
  // Get author ID from original poster
  const authorId = originalPoster?.user_id ?? topic.posters?.[0]?.user_id ?? 0;
  
  // Get author username - prefer original poster's user object, fallback to created_by, then last_poster
  let username = 'unknown';
  let avatarTemplate = '';
  
  if (originalPoster?.user) {
    // Posters array has full user object (from some endpoints)
    username = originalPoster.user.username || 'unknown';
    avatarTemplate = originalPoster.user.avatar_template || '';
  } else if (topic.details?.created_by) {
    // Use created_by if available (more reliable than last_poster)
    username = topic.details.created_by.username || 'unknown';
    avatarTemplate = topic.details.created_by.avatar_template || '';
  } else if (originalPoster?.username) {
    // Poster has username directly
    username = originalPoster.username;
  } else {
    // Fallback to last_poster_username (not ideal, but better than 'unknown')
    username = topic.last_poster_username ?? 'unknown';
    avatarTemplate = topic.last_poster_avatar_template ?? '';
    if (__DEV__) {
      console.warn(`⚠️ topicSummaryToByte: Topic ${topic.id} - Using last_poster_username as fallback (original poster not found)`);
    }
  }
  
  const avatar = avatarTemplate ? discourseApi.getAvatarUrl(avatarTemplate, 120) : '';

  // Map category to hub/teret badges
  // Discourse API returns color as hex string (e.g., "FF6B6B") - add # prefix if needed
  const categoryColor = topic.category?.color;
  const formattedColor = categoryColor 
    ? (categoryColor.startsWith('#') ? categoryColor : `#${categoryColor}`)
    : undefined;
  
  // Determine if this is a Hub (top-level) or Teret (subcategory)
  // Use truthy check to match codebase pattern: 0/null/undefined = Hub, positive number = Teret
  const isTeret = !!topic.category?.parent_category_id;
  const isHub = !isTeret && topic.category_id && topic.category?.name;
  
  // Create Hub badge (if top-level category)
  // Safely access topic.category.name - ensure category exists before accessing properties
  const hub = (isHub && topic.category)
    ? {
        id: topic.category_id,
        name: topic.category.name,
        color: formattedColor,
      }
    : undefined;
  
  // Create Teret badge (if subcategory)
  // Safely access topic.category.name - ensure category exists before accessing properties
  const teret = (isTeret && topic.category_id && topic.category?.name && topic.category)
    ? {
        id: topic.category_id,
        name: topic.category.name,
        color: formattedColor,
      }
    : undefined;
  
  // Get parent hub for terets (from enriched topic data)
  const parentHubColor = topic.parentHub?.color;
  const formattedParentHubColor = parentHubColor 
    ? (parentHubColor.startsWith('#') ? parentHubColor : `#${parentHubColor}`)
    : undefined;
  
  const parentHub = topic.parentHub
    ? {
        id: topic.parentHub.id,
        name: topic.parentHub.name,
        color: formattedParentHubColor,
      }
    : undefined;

  // Debug logging
  if (__DEV__) {
    const debugInfo = {
      topicId: topic.id,
      categoryId: topic.category_id,
      hasCategory: !!topic.category,
      categoryName: topic.category?.name,
      categoryColor: topic.category?.color,
      formattedColor,
      hasParentCategoryId: topic.category?.parent_category_id !== undefined,
      parentCategoryId: topic.category?.parent_category_id,
      isHub,
      isTeret,
      hubCreated: !!hub,
      hubName: hub?.name,
      hubColor: hub?.color,
      teretCreated: !!teret,
      teretName: teret?.name,
      teretColor: teret?.color,
      hasParentHub: !!topic.parentHub,
      parentHubCreated: !!parentHub,
      parentHubName: parentHub?.name,
      parentHubColor: parentHub?.color,
      finalHub: hub || parentHub,
      finalHubName: (hub || parentHub)?.name,
    };
    
    console.log('🔍 topicSummaryToByte: Badge creation', debugInfo);
    
    // Validation warnings
    if (topic.category_id && !topic.category) {
      console.warn(`⚠️ Topic ${topic.id} has category_id ${topic.category_id} but no category data`);
    }
    if (isTeret && !parentHub) {
      console.warn(`⚠️ Topic ${topic.id} is a Teret but parent hub not found (parent_category_id: ${topic.category?.parent_category_id})`);
    }
    if (!isHub && !isTeret && topic.category_id) {
      console.warn(`⚠️ Topic ${topic.id} has category_id ${topic.category_id} but is neither Hub nor Teret`);
    }
  }

  // Summaries don't include cooked content; use excerpt for lightweight previews only
  const cooked = '';
  const excerpt = topic.excerpt || '';

  return {
    id: topic.id,
    title: topic.title,
    author: {
      id: authorId,
      username,
      name: username, // Discourse doesn't send display name in summary
      avatar,
    },
    hub: hub || parentHub, // Show hub if direct hub, or parent hub if teret
    teret, // Show teret if subcategory
    raw: '', // Summaries don't have raw markdown
    cooked, // Empty for summaries - only title is shown
    excerpt,
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
