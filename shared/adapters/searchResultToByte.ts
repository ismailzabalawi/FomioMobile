import type { Byte } from '@/types/byte';
import { extractMedia } from '@/lib/utils/media';
import { discourseApi } from '../discourseApi';
import type { Byte as DiscourseByte, AppUser } from '../discourseApi';

// Declare __DEV__ for TypeScript (React Native global)
declare const __DEV__: boolean;

const FALLBACK_HTML = '<p>[Content unavailable]</p>';

/**
 * Adapter to transform search result Byte (from discourseApi.ts) → Byte (from types/byte.ts)
 * 
 * Aligns with topicSummaryToByte patterns for consistency:
 * - Hub/teret badge logic with parent hub support
 * - Proper avatar URL processing
 * - Color formatting (# prefix)
 * - All required fields (origin, updatedAt, engagement state)
 * - Author ID extraction
 */
export function searchResultToByte(result: DiscourseByte | any): Byte {
  // Debug: Log the actual structure we're receiving
  if (__DEV__) {
    console.log('🔍 searchResultToByte: Input structure', {
      hasId: !!result?.id,
      hasTitle: !!result?.title,
      hasAuthor: !!result?.author,
      authorType: typeof result?.author,
      authorKeys: result?.author ? Object.keys(result.author) : [],
      hasCategory: !!result?.category,
      categoryKeys: result?.category ? Object.keys(result.category) : [],
      hasHubId: !!result?.hubId,
      hasCategoryId: !!result?.category_id,
      hasCategoryDotId: !!result?.category?.id,
      rawResult: JSON.stringify(result, null, 2).substring(0, 500),
    });
  }
  
  // Handle both DiscourseByte type and raw topic data
  // DiscourseByte has author as AppUser (with id as string, username, name, avatar fields)
  // Raw topic has author as object with different structure
  const hasAuthorObject = result && 
                          typeof result.author === 'object' && 
                          result.author !== null;
  const isDiscourseByte = hasAuthorObject && 
                          ('id' in result.author || 'username' in result.author);
  
  // Extract data based on structure
  const topicId = result?.id;
  const title = result?.title || '';
  const excerpt = result?.excerpt || '';
  const content = result?.content || excerpt || FALLBACK_HTML;
  const rawContent = result?.rawContent || '';
  
  // Author data - DiscourseByte has AppUser, raw topic has different structure
  let authorId = 0;
  let username = 'unknown';
  let name = 'Unknown User';
  let avatar = '';
  
  if (isDiscourseByte && result.author) {
    // From DiscourseByte (already mapped by mapDiscourseUserToAppUser)
    const appUser = result.author as AppUser;
    authorId = parseInt(appUser.id || '0', 10);
    username = appUser.username || 'unknown';
    name = appUser.name || appUser.username || 'Unknown User';
    avatar = appUser.avatar || ''; // Already processed by getAvatarUrl
  } else if (result.author) {
    // Raw topic structure
    const author = result.author;
    authorId = author.id || author.user_id || 0;
    username = author.username || 'unknown';
    name = author.name || author.username || 'Unknown User';
    const avatarTemplate = author.avatar_template || '';
    avatar = avatarTemplate 
      ? discourseApi.getAvatarUrl(avatarTemplate, 120)
      : (author.avatar || '');
  } else if (result.details?.created_by) {
    // Alternative structure - created_by is the original creator
    const createdBy = result.details.created_by;
    authorId = createdBy.id || 0;
    username = createdBy.username || 'unknown';
    name = createdBy.name || createdBy.username || 'Unknown User';
    const avatarTemplate = createdBy.avatar_template || '';
    avatar = avatarTemplate 
      ? discourseApi.getAvatarUrl(avatarTemplate, 120)
      : '';
  } else if (result.posters && result.posters.length > 0) {
    // Try to extract original poster from posters array
    const originalPoster = result.posters.find((poster: any) => 
      poster.description?.includes('Original Poster') || 
      poster.extras?.includes('single') ||
      poster.description?.includes('Creator')
    ) || result.posters[0];
    
    if (originalPoster?.user) {
      // Poster has full user object
      authorId = originalPoster.user.id || originalPoster.user_id || 0;
      username = originalPoster.user.username || 'unknown';
      name = originalPoster.user.name || originalPoster.user.username || 'Unknown User';
      const avatarTemplate = originalPoster.user.avatar_template || '';
      avatar = avatarTemplate 
        ? discourseApi.getAvatarUrl(avatarTemplate, 120)
        : '';
    } else if (originalPoster?.user_id) {
      // Poster only has user_id, try to get username from other fields
      authorId = originalPoster.user_id;
      username = originalPoster.username || 'unknown';
      name = originalPoster.name || 'Unknown User';
      const avatarTemplate = originalPoster.avatar_template || '';
      avatar = avatarTemplate 
        ? discourseApi.getAvatarUrl(avatarTemplate, 120)
        : '';
    }
  } else if (result.last_poster) {
    // Last resort: fallback to last poster (not ideal, but better than 'unknown')
    const lastPoster = result.last_poster;
    authorId = lastPoster.id || 0;
    username = lastPoster.username || 'unknown';
    name = lastPoster.name || lastPoster.username || 'Unknown User';
    const avatarTemplate = lastPoster.avatar_template || '';
    avatar = avatarTemplate 
      ? discourseApi.getAvatarUrl(avatarTemplate, 120)
      : '';
    if (__DEV__) {
      console.warn(`⚠️ searchResultToByte: Using last_poster as fallback for result ${result.id || 'unknown'}`);
    }
  }
  
  // Category data - DiscourseByte has category: { id, name, color } and hubId
  // Check multiple possible locations for category ID
  const categoryId = result.category?.id || 
                     result.hubId || 
                     result.category_id ||
                     (result as any).category_id;
  const categoryName = result.category?.name || 
                       result.hubName || 
                       '';
  const categoryColor = result.category?.color || '';
  
  // Format color (add # prefix if missing, handle hex strings like "FF6B6B")
  let formattedColor: string | undefined = undefined;
  if (categoryColor) {
    if (categoryColor.startsWith('#')) {
      formattedColor = categoryColor;
    } else if (/^[0-9A-Fa-f]{6}$/.test(categoryColor)) {
      // Hex color without # prefix (e.g., "FF6B6B")
      formattedColor = `#${categoryColor}`;
    } else {
      formattedColor = categoryColor;
    }
  }
  
  // Determine if this is a Hub (top-level) or Teret (subcategory)
  // Check for parent_category_id in multiple possible locations
  // Note: mapped Byte from discourseApi.mapTopicToByte doesn't include parent_category_id
  // We need to check the raw topic structure if available, or assume it's a hub if no parent
  const parentCategoryId = result.category?.parent_category_id || 
                           result.parent_category_id ||
                           (result as any).parent_category_id;
  // If we don't have parent_category_id info, assume it's a hub (top-level category)
  // This is a limitation - search results from mapTopicToByte don't preserve parent info
  const isTeret = !!parentCategoryId;
  // FIX: Ensure isHub is a boolean, not a string
  const isHub = !isTeret && !!categoryId && !!categoryName;
  
  // Create Hub badge (if top-level category or if we can't determine)
  const hub = (isHub && categoryName)
    ? {
        id: categoryId,
        name: categoryName,
        color: formattedColor,
      }
    : undefined;
  
  // Create Teret badge (if subcategory)
  const teret = (isTeret && categoryId && categoryName)
    ? {
        id: categoryId,
        name: categoryName,
        color: formattedColor,
      }
    : undefined;
  
  // Parent hub for terets (would need to be enriched from API, but we'll leave undefined for now)
  // This could be added if search results include parent category data
  const parentHub = undefined;
  
  // Debug logging
  if (__DEV__) {
    const debugInfo = {
      topicId,
      title: title.substring(0, 50),
      isDiscourseByte,
      hasAuthor: !!result.author,
      authorId,
      username,
      name,
      hasAvatar: !!avatar,
      categoryId,
      categoryName,
      categoryColor,
      formattedColor,
      parentCategoryId,
      isHub,
      isTeret,
      hubCreated: !!hub,
      hubName: hub?.name,
      teretCreated: !!teret,
      teretName: teret?.name,
      hasContent: !!content,
      contentLength: content.length,
      hasExcerpt: !!excerpt,
      excerptLength: excerpt.length,
    };
    
    console.log('🔍 searchResultToByte: Transformation result', debugInfo);
    
    // Validation warnings
    if (!topicId) {
      console.warn(`⚠️ Search result missing id`);
    }
    if (!title) {
      console.warn(`⚠️ Search result ${topicId} missing title`);
    }
    if (categoryId && !categoryName) {
      console.warn(`⚠️ Search result ${topicId} has category_id ${categoryId} but no category name`);
    }
    if (!authorId && !username) {
      console.warn(`⚠️ Search result ${topicId} missing author information`);
    }
    if (isTeret && !parentHub) {
      console.warn(`⚠️ Search result ${topicId} is a Teret but parent hub not found (parent_category_id: ${parentCategoryId})`);
    }
  }
  
  // Use content/excerpt for search results (shows context, unlike home feed summaries)
  const cooked = content || excerpt || FALLBACK_HTML;
  
  // Extract images from content/excerpt
  const media = extractMedia(cooked);
  
  // Engagement state
  const isLiked = result.isLiked || false;
  const isBookmarked = result.isBookmarked || false;
  
  // Stats - handle both naming conventions
  const likeCount = result.likeCount || result.like_count || 0;
  const replyCount = result.replyCount || 
                    result.reply_count || 
                    result.commentCount ||
                    Math.max(0, (result.posts_count || 1) - 1);
  const views = result.views || result.viewCount;
  
  // Dates
  const createdAt = result.createdAt || result.created_at || new Date().toISOString();
  const updatedAt = result.updatedAt || 
                   result.updated_at || 
                   result.last_posted_at || 
                   result.lastActivity ||
                   createdAt;
  
  const transformedByte: Byte = {
    id: topicId,
    title,
    author: {
      id: authorId,
      username,
      name,
      avatar,
    },
    hub: hub || parentHub, // Show hub if direct hub, or parent hub if teret
    teret, // Show teret if subcategory
    raw: rawContent,
    cooked, // Show excerpt/content for search context
    createdAt,
    updatedAt,
    origin: 'hydrated', // Search results are hydrated (have content)
    media: media.length > 0 ? media : undefined,
    linkPreview: undefined,
    stats: {
      likes: likeCount,
      replies: replyCount,
      views,
    },
    isLiked,
    isBookmarked,
  };
  
  // Final validation
  if (__DEV__) {
    if (!transformedByte.id || !transformedByte.title) {
      console.error('❌ searchResultToByte: Invalid transformed byte', {
        hasId: !!transformedByte.id,
        hasTitle: !!transformedByte.title,
        transformed: transformedByte,
      });
    }
  }
  
  return transformedByte;
}

