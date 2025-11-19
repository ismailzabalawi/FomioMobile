import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { getMarkdownStyles } from '@/shared/markdown-styles';
import * as WebBrowser from 'expo-web-browser';

export interface MarkdownContentProps {
  content: string; // HTML from Discourse `cooked` field
  isRawMarkdown?: boolean; // If true, content is already markdown
}

// Minimal emoji mapping for Discourse-specific shortcodes
// Most Discourse emojis already output Unicode in the alt attribute, so we only map shortcodes
const DISCOURSE_EMOJI_MAP: Record<string, string> = {
  'e_mail': '📧',
  'handshake': '🤝',
  'speech_balloon': '💬',
  // Add more Discourse-specific shortcodes as needed
};

// Helper to convert emoji shortcodes to Unicode
// Leverages system emoji fonts - no external libraries needed
function convertEmojiShortcode(alt: string): string {
  // If it's already Unicode emoji, return as-is
  // Unicode emoji ranges: U+1F300-1F9FF, U+2600-26FF, U+2700-27BF
  if (/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(alt)) {
    return alt;
  }
  
  // Check if it's a shortcode format like :e_mail: or e_mail
  const shortcode = alt.replace(/^:|:$/g, '').trim();
  if (shortcode && DISCOURSE_EMOJI_MAP[shortcode]) {
    return DISCOURSE_EMOJI_MAP[shortcode];
  }
  
  // Return original if not found (might be text or unknown shortcode)
  return alt;
}

// Simple HTML to Markdown converter for React Native (doesn't require DOM)
// This replaces turndown which requires a browser environment
function htmlToMarkdown(html: string): string {
  if (!html) return '';

  let markdown = html;

  // Remove script and style tags with their content
  markdown = markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  markdown = markdown.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Convert Discourse mentions first (before other spans)
  markdown = markdown.replace(/<span[^>]*class=["'][^"']*mention[^"']*["'][^>]*data-username=["']([^"']*)["'][^>]*>.*?<\/span>/gi, '@$1');
  markdown = markdown.replace(/<span[^>]*class=["'][^"']*mention[^"']*["'][^>]*>(.*?)<\/span>/gi, '@$1');

  // Convert Discourse emojis (before other images)
  // Extract alt text and convert shortcodes to Unicode emojis (uses system fonts)
  markdown = markdown.replace(/<img[^>]*class=["'][^"']*emoji[^"']*["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, (match, alt) => {
    return convertEmojiShortcode(alt);
  });
  
  // Also handle emoji shortcodes that might appear in text (like :e_mail:)
  markdown = markdown.replace(/:([a-z_]+):/gi, (match, code) => {
    return DISCOURSE_EMOJI_MAP[code] || match; // Convert if mapped, otherwise keep original
  });

  // Convert inline code FIRST (before other inline elements, so it's preserved)
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // Convert links (before headings, so headings can contain links)
  markdown = markdown.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, (match, href, text) => {
    const linkText = text.replace(/<[^>]*>/g, '').trim();
    return `[${linkText || href}](${href})`;
  });

  // Convert strong/bold (before headings, so headings can contain bold)
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');

  // Convert emphasis/italic (before headings, so headings can contain italic)
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  // Convert headings (H1-H6) - NOW they can contain properly formatted markdown
  // Process from H6 to H1 to avoid conflicts (smaller headings first)
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, (match, content) => {
    const text = content.trim();
    return text ? `###### ${text}\n\n` : '';
  });
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, (match, content) => {
    const text = content.trim();
    return text ? `##### ${text}\n\n` : '';
  });
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, (match, content) => {
    const text = content.trim();
    return text ? `#### ${text}\n\n` : '';
  });
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, (match, content) => {
    const text = content.trim();
    return text ? `### ${text}\n\n` : '';
  });
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, (match, content) => {
    const text = content.trim();
    return text ? `## ${text}\n\n` : '';
  });
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, (match, content) => {
    const text = content.trim();
    return text ? `# ${text}\n\n` : '';
  });

  // Convert blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    if (!text) return '';
    return `> ${text.split('\n').join('\n> ')}\n\n`;
  });

  // Convert code blocks (pre > code)
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, (match, content) => {
    const code = content.replace(/<[^>]*>/g, '').trim();
    return `\n\`\`\`\n${code}\n\`\`\`\n\n`;
  });

  // Convert images (non-emoji)
  markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi, (match, src, alt) => {
    // Skip if it's an emoji (already converted above)
    if (match.includes('emoji')) return '';
    return `![${alt || ''}](${src})`;
  });

  // Convert lists - unordered
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gi, (match, content) => {
    const items = content.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
    const listItems = items.map((item: string) => {
      const text = item.replace(/<li[^>]*>|<\/li>/gi, '').replace(/<[^>]*>/g, '').trim();
      return text ? `- ${text}` : '';
    }).filter(Boolean).join('\n');
    return listItems ? `${listItems}\n\n` : '';
  });

  // Convert lists - ordered
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gi, (match, content) => {
    const items = content.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
    const listItems = items.map((item: string, index: number) => {
      const text = item.replace(/<li[^>]*>|<\/li>/gi, '').replace(/<[^>]*>/g, '').trim();
      return text ? `${index + 1}. ${text}` : '';
    }).filter(Boolean).join('\n');
    return listItems ? `${listItems}\n\n` : '';
  });

  // Convert paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

  // Convert line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

  // Convert horizontal rules
  markdown = markdown.replace(/<hr\s*\/?>/gi, '\n---\n\n');

  // Remove all remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  markdown = markdown
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`');

  // Clean up extra whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.trim();

  return markdown;
}

// UI Spec: MarkdownContent — Renders Discourse cooked HTML as styled markdown
// - Supports headings, paragraphs, lists, code, quotes, links, images
// - Themed with Fomio semantic tokens
// - Images are tappable (future: lightbox)
// - Links open in in-app browser
// - Proper typography: line-height, margins, no edge-to-edge text
export function MarkdownContent({ content, isRawMarkdown = false }: MarkdownContentProps) {
  const { isDark, isAmoled } = useTheme();

  // Convert HTML to markdown if needed
  const markdown = useMemo(() => {
    if (isRawMarkdown) return content;
    try {
      // Use our React Native-compatible HTML to Markdown converter
      return htmlToMarkdown(content);
    } catch (error) {
      console.error('Error converting HTML to markdown:', error);
      // Fallback: strip HTML tags and return plain text
      return content.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '');
    }
  }, [content, isRawMarkdown]);

  // Use shared markdown styles (matches preview in ComposeEditor)
  const markdownStyles = useMemo(() => getMarkdownStyles(isDark), [isDark]);

  // Custom renderers for interactive elements
  const renderers = {
    // Make links open in in-app browser
    link: (node: any, children: any, parent: any, styles: any) => {
      return (
        <Text
          key={node.key}
          style={styles.link}
          onPress={async () => {
            const url = node.attributes?.href;
            if (url) {
              try {
                await WebBrowser.openBrowserAsync(url, {
                  presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                  controlsColor: isDark ? '#60a5fa' : '#2563eb',
                });
              } catch (error) {
                // Fallback to system browser
                Linking.openURL(url).catch(() => {});
              }
            }
          }}
        >
          {children}
        </Text>
      );
    },
    
    // Make images tappable (future: lightbox)
    image: (node: any, children: any, parent: any, styles: any) => {
      const src = node.attributes?.src;
      if (!src) return null;
      
      return (
        <TouchableOpacity
          key={node.key}
          activeOpacity={0.9}
          onPress={() => {
            // TODO: Open lightbox/modal with full-size image
            console.log('Image tapped:', src);
          }}
          style={styles.image}
        >
          <Image
            source={{ uri: src }}
            style={{
              width: '100%',
              aspectRatio: 16 / 9,
              resizeMode: 'cover',
            }}
            contentFit="cover"
            transition={200}
            accessibilityLabel="Post image"
          />
        </TouchableOpacity>
      );
    },
  };

  return (
    <View style={{ paddingHorizontal: 0 }}>
      <Markdown
        style={markdownStyles}
        rules={renderers}
        mergeStyle={true}
      >
        {markdown}
      </Markdown>
    </View>
  );
}

