import type { Byte } from '@/types/byte';
import { discourseApi } from '../discourseApi';
import { extractMedia } from '@/lib/utils/media';

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
  
  // Get users map from enriched topic data
  const usersMap = topic.usersMap;
  
  // Get author username - the original poster is ALWAYS in the posters array
  // Look up username from users map using user_id from poster
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
  } else if (originalPoster?.user_id && usersMap) {
    // Look up username from users map using user_id from poster
    const user = usersMap.get(originalPoster.user_id);
    if (user) {
      username = user.username || 'unknown';
      avatarTemplate = user.avatar_template || '';
    } else {
      // User not found in map - this shouldn't happen but handle gracefully
      if (__DEV__) {
        console.warn(`⚠️ topicSummaryToByte: Topic ${topic.id} - User ${originalPoster.user_id} not found in users map`);
      }
    }
  } else if (originalPoster?.username) {
    // Poster has username directly - also get avatar_template from poster object
    username = originalPoster.username;
    avatarTemplate = originalPoster.avatar_template || '';
  } else if (topic.posters?.length > 0) {
    // If we somehow don't have originalPoster but posters array exists, try first poster
    const firstPoster = topic.posters[0];
    if (firstPoster?.user_id && usersMap) {
      const user = usersMap.get(firstPoster.user_id);
      if (user) {
        username = user.username || 'unknown';
        avatarTemplate = user.avatar_template || '';
      }
    } else if (firstPoster?.username) {
      username = firstPoster.username;
      avatarTemplate = firstPoster.avatar_template || '';
    }
    if (__DEV__ && username === 'unknown') {
      console.warn(`⚠️ topicSummaryToByte: Topic ${topic.id} - Using first poster as fallback. Original poster not found.`);
    }
  } else {
    // ONLY use last_poster_username if posters array is completely missing
    // This should be extremely rare
    username = topic.last_poster_username ?? 'unknown';
    avatarTemplate = topic.last_poster_avatar_template ?? '';
    if (__DEV__) {
      console.warn(`⚠️ topicSummaryToByte: Topic ${topic.id} - Using last_poster_username as last resort. Posters array missing.`);
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

  // Summaries: Use excerpt as cooked content so it can be rendered with proper formatting
  // The excerpt from Discourse API may be HTML or plain text with \n newlines
  const excerpt = topic.excerpt || '';
  
  // Debug logging for excerpt processing
  if (__DEV__ && topic.id) {
    console.log(`📝 topicSummaryToByte: Processing excerpt for topic ${topic.id}`, {
      hasExcerpt: !!excerpt,
      excerptLength: excerpt.length,
      excerptPreview: excerpt.substring(0, 100),
      hasHtmlTags: excerpt.trim().match(/<[^>]+>/) !== null,
    });
  }
  
  // Convert plain text excerpts to HTML (if it doesn't already contain HTML tags)
  // Discourse excerpts can be either HTML or plain text, so we need to handle both
  let cooked = excerpt;
  if (excerpt && !excerpt.trim().match(/<[^>]+>/)) {
    // Plain text excerpt: convert \n\n to paragraph breaks and \n to <br>
    // First, split on double newlines for paragraphs
    const paragraphs = excerpt.split(/\n\n+/).filter((p: string) => p.trim());
    if (paragraphs.length > 0) {
      cooked = paragraphs
        .map((p: string) => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
        .join('');
    } else {
      // Single paragraph with line breaks
      cooked = `<p>${excerpt.trim().replace(/\n/g, '<br>')}</p>`;
    }
    
    // Debug logging for excerpt conversion
    if (__DEV__) {
      console.log(`📝 topicSummaryToByte: Converted plain text excerpt to HTML for topic ${topic.id}`, {
        originalLength: excerpt.length,
        convertedLength: cooked.length,
        hasParagraphs: paragraphs.length > 1,
        cookedPreview: cooked.substring(0, 150),
      });
    }
  } else if (excerpt) {
    // Already HTML, log that we're using it as-is
    if (__DEV__) {
      console.log(`📝 topicSummaryToByte: Using HTML excerpt as-is for topic ${topic.id}`, {
        excerptLength: excerpt.length,
        excerptPreview: excerpt.substring(0, 150),
      });
    }
  }

  // Extract media from multiple sources:
  // 1. Direct image_url field (if available)
  // 2. Thumbnails array (if available)
  // 3. Images embedded in excerpt HTML
  const media: string[] = [];
  const baseUrl = discourseApi.getBaseUrl();
  
  // Helper to normalize URLs (convert relative to absolute)
  // React Native Image component requires absolute URLs
  const normalizeUrl = (url: string): string => {
    if (!url) return url;
    // If already absolute, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If relative, prepend baseUrl
    // Handle both /uploads/... and uploads/... formats
    return baseUrl ? `${baseUrl}${url.startsWith('/') ? url : `/${url}`}` : url;
  };
  
  // Check for direct image_url
  if (topic.image_url) {
    media.push(normalizeUrl(topic.image_url));
  }
  
  // Check for thumbnails array
  if (topic.thumbnails && Array.isArray(topic.thumbnails)) {
    topic.thumbnails.forEach((thumb: string) => {
      if (thumb) {
        const normalized = normalizeUrl(thumb);
        if (!media.includes(normalized)) {
          media.push(normalized);
        }
      }
    });
  }
  
  // Extract images from excerpt HTML (if it contains HTML)
  if (excerpt) {
    const excerptMedia = extractMedia(excerpt);
    excerptMedia.forEach((url) => {
      const normalized = normalizeUrl(url);
      if (!media.includes(normalized)) {
        media.push(normalized);
      }
    });
  }
  
  // Debug logging for media extraction
  if (__DEV__ && media.length > 0) {
    console.log(`🖼️ topicSummaryToByte: Extracted ${media.length} media item(s) for topic ${topic.id}`, {
      hasImageUrl: !!topic.image_url,
      hasThumbnails: !!(topic.thumbnails && topic.thumbnails.length > 0),
      excerptHasImages: excerpt && excerpt.includes('<img'),
      mediaUrls: media,
    });
  }

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
    cooked, // Use excerpt as cooked content for summaries (rendered as HTML/markdown)
    excerpt,
    createdAt: topic.created_at || new Date().toISOString(),
    updatedAt: topic.last_posted_at || topic.created_at || new Date().toISOString(),
    origin: 'summary', // Always summary from /latest.json
    media: media.length > 0 ? media : undefined, // Extract media from available sources
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
