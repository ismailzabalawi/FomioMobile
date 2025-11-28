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
    hub: hub || parentHub, // Show hub if direct hub, or parent hub if teret
    teret, // Show teret if subcategory
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

