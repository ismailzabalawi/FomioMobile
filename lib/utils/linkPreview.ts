/**
 * Link Preview Extraction Utility
 * 
 * Extracts link preview data from Discourse's cooked HTML onebox structure.
 * Supports multiple providers: YouTube, Twitter, GitHub, Wikipedia, and generic articles.
 */

export type OneboxProvider = 'youtube' | 'twitter' | 'github' | 'wikipedia' | 'article' | 'generic';

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  provider: OneboxProvider;
  // Provider-specific metadata
  videoId?: string;      // YouTube
  duration?: string;     // YouTube
  tweetId?: string;      // Twitter
  repoStats?: {          // GitHub
    stars: number;
    forks: number;
    language?: string;
  };
}

/**
 * Detect provider from URL patterns
 */
function detectProvider(url: string): OneboxProvider {
  if (!url) return 'generic';
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return 'twitter';
  }
  if (lowerUrl.includes('github.com')) {
    return 'github';
  }
  if (lowerUrl.includes('wikipedia.org') || lowerUrl.includes('wiki')) {
    return 'wikipedia';
  }
  
  return 'article';
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([A-Za-z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Extract Twitter/X tweet ID from URL
 */
function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extract GitHub repo info from URL
 */
function extractGitHubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, '').split('/')[0], // Remove .git and query params
  };
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Extract text content from HTML element
 */
function extractTextContent(html: string, selector: string): string | null {
  // Extract content from element with specific class
  const classRegex = new RegExp(`<[^>]*class="[^"]*${selector.replace('.', '')}[^"]*"[^>]*>([\\s\\S]*?)</[^>]+>`, 'i');
  const match = html.match(classRegex);
  if (match) {
    return stripHtml(match[1]);
  }
  
  // Try without class, just tag name
  const tagMatch = html.match(new RegExp(`<${selector}[^>]*>([\\s\\S]*?)</${selector}>`, 'i'));
  if (tagMatch) {
    return stripHtml(tagMatch[1]);
  }
  
  return null;
}

/**
 * Extract image URL from onebox HTML
 */
function extractImageUrl(html: string): string | null {
  // Look for onebox-image class first
  const oneboxImageMatch = html.match(/<[^>]*class="[^"]*onebox-image[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
  if (oneboxImageMatch) {
    const imgMatch = oneboxImageMatch[1].match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) return imgMatch[1];
  }
  
  // Fallback to any img tag in the onebox
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  
  return null;
}

/**
 * Extract site name/favicon from onebox HTML
 */
function extractSiteName(html: string): string | null {
  // Look for onebox-site-name class
  const siteName = extractTextContent(html, 'onebox-site-name');
  if (siteName) return siteName;
  
  // Try source class
  const source = extractTextContent(html, 'source');
  if (source) return source;
  
  return null;
}

/**
 * Extract link preview from Discourse cooked HTML
 * 
 * Looks for the first <aside class="onebox"> element and extracts:
 * - URL from data-url attribute
 * - Title, description, image, site name from HTML structure
 * - Provider type from URL patterns
 * 
 * @param cooked - Cooked HTML from Discourse
 * @returns LinkPreview object or undefined if no onebox found
 */
export function extractLinkPreview(cooked: string): LinkPreview | undefined {
  if (!cooked) return undefined;
  
  // Find first onebox aside element
  const oneboxMatch = cooked.match(/<aside[^>]*class="[^"]*onebox[^"]*"[^>]*>([\s\S]*?)<\/aside>/i);
  if (!oneboxMatch) return undefined;
  
  const oneboxHtml = oneboxMatch[0];
  const oneboxContent = oneboxMatch[1];
  
  // Extract URL from data-url attribute
  const urlMatch = oneboxHtml.match(/data-url=["']([^"']+)["']/i);
  if (!urlMatch) return undefined;
  
  const url = urlMatch[1];
  const provider = detectProvider(url);
  
  // Extract basic fields
  const title = extractTextContent(oneboxContent, 'onebox-title') || 
                extractTextContent(oneboxContent, 'h3') ||
                extractTextContent(oneboxContent, 'h2');
  
  const description = extractTextContent(oneboxContent, 'onebox-description') ||
                     extractTextContent(oneboxContent, 'p');
  
  const image = extractImageUrl(oneboxContent);
  const siteName = extractSiteName(oneboxContent);
  
  // Build base preview
  const preview: LinkPreview = {
    url,
    title: title || undefined,
    description: description || undefined,
    image: image || undefined,
    siteName: siteName || undefined,
    provider,
  };
  
  // Add provider-specific metadata
  if (provider === 'youtube') {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      preview.videoId = videoId;
    }
    // Extract duration if available (usually in title or description)
    // Discourse oneboxes sometimes include duration in the title
    const durationMatch = (title || description || '').match(/(\d+:\d+)/);
    if (durationMatch) {
      preview.duration = durationMatch[1];
    }
  }
  
  if (provider === 'twitter') {
    const tweetId = extractTweetId(url);
    if (tweetId) {
      preview.tweetId = tweetId;
    }
  }
  
  if (provider === 'github') {
    const repo = extractGitHubRepo(url);
    // Note: GitHub stats would need to come from Discourse's onebox data
    // or a separate API call. For now, we just detect it's a GitHub link.
    if (repo) {
      preview.siteName = `${repo.owner}/${repo.repo}`;
    }
  }
  
  return preview;
}

