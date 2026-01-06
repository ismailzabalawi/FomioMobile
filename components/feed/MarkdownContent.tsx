import React, { useMemo, memo, useState } from 'react';
import { View, Text, TouchableOpacity, Linking, ScrollView, useWindowDimensions, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import RenderHTML, { HTMLContentModel, HTMLElementModel } from 'react-native-render-html';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/components/theme';
import { getMarkdownStyles } from '@/shared/markdown-styles';
import * as WebBrowser from 'expo-web-browser';
import { getTokens } from '@/shared/design/tokens';
import { LinkPreviewCard } from '@/components/shared/link-preview';
import { extractLinkPreview } from '@/lib/utils/linkPreview';
import type { LinkPreview } from '@/components/shared/link-preview';

export interface MarkdownContentProps {
  content: string; // HTML from Discourse `cooked` field
  isRawMarkdown?: boolean; // If true, content is already markdown
  linkMetadata?: Record<
    string,
    {
      title?: string;
      description?: string;
      image?: string;
      favicon?: string;
      siteName?: string;
      publishedAt?: string;
      type?: 'article' | 'video' | 'post' | 'generic';
    }
  >;
  lazyLoadVideos?: boolean; // If true, videos are only rendered when in viewport
  readingMode?: boolean; // If true, applies premium reading typography (larger font, better spacing, drop cap)
}

// Lazy-loaded video embed component to avoid rendering heavy WebViews until needed
function LazyVideoEmbed({ 
  embedUrl, 
  baseTextColor, 
  tokens,
  lazyLoad = true 
}: { 
  embedUrl: string; 
  baseTextColor: string; 
  tokens: any;
  lazyLoad?: boolean;
}) {
  const [shouldLoad, setShouldLoad] = useState(!lazyLoad);
  
  if (!shouldLoad) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShouldLoad(true)}
        style={{
          width: '100%',
          aspectRatio: 16 / 9,
          borderRadius: 12,
          backgroundColor: tokens.colors.surfaceMuted,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: baseTextColor, fontSize: 16, fontWeight: '600' }}>
          ▶ Play Video
        </Text>
      </TouchableOpacity>
    );
  }
  
  return (
    <WebView
      source={{ html: buildVideoEmbedHtml(embedUrl) }}
      originWhitelist={['*']}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      scrollEnabled={false}
      allowsFullscreenVideo
      setSupportMultipleWindows={false}
      style={{ flex: 1, backgroundColor: 'transparent' }}
    />
  );
}

/**
 * Extract onebox description from tree node
 */
function extractOneboxDescription(tnode: any): string | null {
  if (!tnode || !tnode.children) return null;
  
  const children = Array.isArray(tnode.children) ? tnode.children : [];
  
  // Search for element with onebox-description class
  for (const child of children) {
    const className = child.attributes?.class || '';
    if (className.split(' ').includes('onebox-description')) {
      return extractTextContent(child);
    }
    // Recursively search in nested children
    const found = extractOneboxDescription(child);
    if (found) return found;
  }
  
  return null;
}

/**
 * Serialize tnode to HTML string for extraction
 * This converts the tree node back to HTML so we can use extractLinkPreview utility
 */
function serializeTNodeToHtml(tnode: any): string {
  if (!tnode) return '';
  
  // If it's a text node, return the text (escape HTML entities)
  if (tnode.type === 'text' && tnode.data) {
    return tnode.data
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  // Build the opening tag
  const tagName = tnode.tagName || 'div';
  const attrs = tnode.attributes || {};
  const attrString = Object.entries(attrs)
    .map(([key, value]) => {
      const val = String(value).replace(/"/g, '&quot;');
      return `${key}="${val}"`;
    })
    .join(' ');
  const openTag = attrString ? `<${tagName} ${attrString}>` : `<${tagName}>`;
  
  // Recursively serialize children
  const children = Array.isArray(tnode.children) ? tnode.children : [];
  const childrenHtml = children.map((child: any) => serializeTNodeToHtml(child)).join('');
  
  // Self-closing tags
  const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
  if (selfClosingTags.includes(tagName.toLowerCase())) {
    return openTag.replace('>', ' />');
  }
  
  return `${openTag}${childrenHtml}</${tagName}>`;
}

// Onebox renderer component for Discourse link previews
function OneboxRenderer({ 
  tnode, 
  TNodeChildrenRenderer,
  tokens,
  renderLink,
  linkMetadata,
  oneboxContainerStyle
}: { 
  tnode: any; 
  TNodeChildrenRenderer: any;
  tokens: any;
  renderLink: { onPress: (event: any, href: string) => Promise<void> };
  linkMetadata?: Record<string, {
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    siteName?: string;
    publishedAt?: string;
    type?: 'article' | 'video' | 'post' | 'generic';
  }>;
  oneboxContainerStyle: any;
}) {
  // Serialize tnode to HTML and use extractLinkPreview utility (same as ByteCard)
  const oneboxHtml = serializeTNodeToHtml(tnode);
  const preview = extractLinkPreview(oneboxHtml);
  
  // If we successfully extracted preview, use LinkPreviewCard
  if (preview) {
    // Merge with linkMetadata if available
    const url = preview.url;
    const metadata = url ? linkMetadata?.[url] : undefined;
    
    if (metadata) {
      preview.title = metadata.title || preview.title;
      preview.description = metadata.description || preview.description;
      preview.image = metadata.image || preview.image;
      preview.favicon = metadata.favicon || preview.favicon;
      preview.siteName = metadata.siteName || preview.siteName;
    }
    
    const handlePress = () => {
      if (url) {
        renderLink.onPress(undefined, url);
      }
    };
    
    return <LinkPreviewCard preview={preview} onPress={handlePress} />;
  }
  
  // Fallback to original HTML rendering if extraction fails
  const url = extractOneboxUrl(tnode);
  const title = extractOneboxTitle(tnode) || url || 'Link preview';
  
  const handlePress = () => {
    if (url) {
      renderLink.onPress(undefined, url);
    }
  };
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={[oneboxContainerStyle]}
      accessible
      accessibilityRole="link"
      accessibilityLabel={title}
      accessibilityHint="Opens link in browser"
    >
      <TNodeChildrenRenderer tnode={tnode} />
    </TouchableOpacity>
  );
}

// Details/Spoiler component for Discourse [spoiler] and [details] blocks
function DetailsRenderer({ 
  tnode, 
  TNodeChildrenRenderer,
  tokens 
}: { 
  tnode: any; 
  TNodeChildrenRenderer: any;
  tokens: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Extract summary text from details element
  const summaryText = findSummaryText(tnode);
  const hasSummary = !!summaryText;
  
  return (
    <View
      style={{
        marginVertical: 12,
        borderWidth: 1,
        borderColor: tokens.colors.border,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: tokens.colors.surfaceMuted,
      }}
    >
      {hasSummary && (
        <TouchableOpacity
          onPress={() => setIsOpen(!isOpen)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
            backgroundColor: tokens.colors.surfaceMuted,
          }}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel={isOpen ? 'Collapse' : 'Expand'}
          accessibilityState={{ expanded: isOpen }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: tokens.colors.text,
              flex: 1,
            }}
          >
            {summaryText}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: tokens.colors.muted,
              marginLeft: 8,
            }}
          >
            {isOpen ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
      )}
      {isOpen && (
        <View style={{ padding: 12, paddingTop: hasSummary ? 0 : 12 }}>
          <TNodeChildrenRenderer tnode={tnode} />
        </View>
      )}
    </View>
  );
}

// UI Spec: MarkdownContent — Renders Discourse cooked HTML or raw markdown with full fidelity
// - Supports headings, paragraphs, lists, code, quotes, links, images, tables, HRs
// - Themed with Fomio semantic tokens
// - Links open in in-app browser
// - Images use expo-image and are tappable (lightbox-ready)
function MarkdownContentComponent({
  content,
  isRawMarkdown = false,
  linkMetadata,
  lazyLoadVideos = true,
  readingMode = false,
}: MarkdownContentProps) {
  const { isDark, isAmoled } = useTheme();
  const mode = isDark ? (isAmoled ? 'darkAmoled' : 'dark') : 'light';
  const tokens = useMemo(() => getTokens(mode), [mode]);
  const { width } = useWindowDimensions();
  const markdownStyles = useMemo(() => getMarkdownStyles(mode), [mode]);
  // In reading mode, constrain to 680px max for optimal reading width
  // Otherwise, use responsive width with margins
  const contentWidth = readingMode 
    ? Math.min(680, Math.max(320, width - 40)) 
    : Math.max(320, width - 32);
  const baseTextColor = tokens.colors.text;
  const codeFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

  const oneboxContainerStyle = useMemo(
    () => ({
      marginVertical: 16, // Increased from 10 for better separation
      padding: 0, // Remove padding, add to inner content instead
      borderRadius: 12, // Slightly smaller for modern look
      borderWidth: 1,
      borderColor: tokens.colors.border,
      backgroundColor: tokens.colors.surfaceMuted,
      overflow: 'hidden', // Important for image corners
      // Enhanced shadow for depth
      shadowColor: tokens.colors.shadow || '#000',
      shadowOpacity: isDark ? 0.15 : 0.08, // More visible in dark mode
      shadowRadius: 8, // Increased from 6
      shadowOffset: { width: 0, height: 2 },
      elevation: 2, // Android shadow
    }),
    [tokens.colors.border, tokens.colors.surfaceMuted, tokens.colors.shadow, isDark]
  );

  const classesStyles = useMemo(
    () => ({
      onebox: {
        marginVertical: 0,
      },
      'onebox-body': {
        padding: 16, // Add padding here instead of container
        paddingTop: 12, // Less top padding if image exists
      },
      source: {
        color: tokens.colors.muted,
        fontSize: 11, // Slightly smaller
        fontWeight: '500',
        marginBottom: 8,
        textTransform: 'uppercase', // Make it look like a label
        letterSpacing: 0.5,
      },
      'onebox-title': {
        color: baseTextColor,
        fontSize: 17, // Slightly larger
        fontWeight: '700',
        lineHeight: 24, // Better line height
        marginBottom: 8, // Increased spacing
        marginTop: 4,
        letterSpacing: -0.2, // Tighter for headlines
      },
      'onebox-description': {
        color: tokens.colors.muted,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 4,
        marginBottom: 12,
      },
      'onebox-site-name': {
        color: tokens.colors.accent,
        fontSize: 13, // Slightly larger
        fontWeight: '600',
        marginTop: 8,
        letterSpacing: 0.3, // Slightly spaced for readability
      },
      'onebox-image': {
        width: '100%',
        aspectRatio: 16 / 9, // Consistent aspect ratio
        borderRadius: 0, // Remove border radius, container handles it
        overflow: 'hidden',
        marginTop: 0, // No margin, image is at top
        backgroundColor: tokens.colors.surfaceMuted, // Loading placeholder
      },
      'onebox-avatar': {
        borderRadius: 6, // Slightly smaller
        overflow: 'hidden',
        width: 20,
        height: 20,
      },
    }),
    [baseTextColor, tokens.colors.accent, tokens.colors.muted, tokens.colors.surfaceMuted]
  );

  // Renderer for links (shared across HTML and markdown paths)
  const renderLink = useMemo(
    () => ({
      onPress: async (_event: any, href: string) => {
        if (!href) return;
        try {
          await WebBrowser.openBrowserAsync(href, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            controlsColor: tokens.colors.accent,
          });
        } catch {
          Linking.openURL(href).catch(() => {});
        }
      },
    }),
    [tokens.colors.accent]
  );

  // Custom renderers for RenderHTML (cooked HTML path)
  const htmlRenderers = useMemo(
    () => ({
      aside: (props: any) => {
        const { tnode, TDefaultRenderer, TNodeChildrenRenderer } = props;
        const className = tnode?.attributes?.class || '';
        const classList = className.split(' ');
        const isOnebox = classList.includes('onebox');
        const isQuote = classList.includes('quote');
        
        // Handle oneboxes (link previews)
        if (isOnebox) {
          return (
            <OneboxRenderer
              tnode={tnode}
              TNodeChildrenRenderer={TNodeChildrenRenderer}
              tokens={tokens}
              renderLink={renderLink}
              linkMetadata={linkMetadata}
              oneboxContainerStyle={oneboxContainerStyle}
            />
          );
        }
        
        // Handle Discourse quote blocks [quote="user"] or [quote]
        if (isQuote) {
          const dataUsername = tnode?.attributes?.['data-username'];
          const dataPost = tnode?.attributes?.['data-post'];
          const dataTopic = tnode?.attributes?.['data-topic'];
          const title = tnode?.attributes?.title;
          
          // Extract quote title from title attribute or data attributes
          let quoteTitle: string | null = null;
          if (dataUsername) {
            quoteTitle = `@${dataUsername}`;
            if (dataPost) {
              quoteTitle += ` (post ${dataPost})`;
            } else if (dataTopic) {
              quoteTitle += ` (topic ${dataTopic})`;
            }
          } else if (title) {
            quoteTitle = title;
          }
          
          return (
            <View
              style={[
                {
                  backgroundColor: tokens.colors.surfaceMuted,
                  borderLeftWidth: 4,
                  borderLeftColor: tokens.colors.accent,
                  paddingLeft: 16,
                  paddingRight: 16,
                  paddingTop: 12,
                  paddingBottom: 12,
                  marginTop: 12,
                  marginBottom: 16,
                  borderRadius: 8,
                },
                props.style,
              ]}
            >
              {quoteTitle && (
                <View style={{ marginBottom: 8 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: tokens.colors.accent,
                    }}
                  >
                    {quoteTitle}
                  </Text>
                </View>
              )}
              <TNodeChildrenRenderer tnode={tnode} />
            </View>
          );
        }
        
        return <TDefaultRenderer {...props} />;
      },
      // Paragraph renderer: enhanced typography for reading mode
      // Note: Drop cap can be added later if desired, but requires more complex text parsing
      p: readingMode ? (props: any) => {
        const { tnode, TNodeChildrenRenderer } = props;
        return (
          <View style={{ marginBottom: 24 }}>
            <TNodeChildrenRenderer tnode={tnode} />
          </View>
        );
      } : undefined,
      a: (props: any) => {
        const { tnode, TDefaultRenderer, TNodeChildrenRenderer } = props;
        const href = tnode?.attributes?.href;
        if (!href) return <TDefaultRenderer {...props} />;
        
        const metadata = href ? linkMetadata?.[href] : undefined;
        const linkText = extractTextContent(tnode);
        
        // Check if link text is just the URL (not custom text)
        // This indicates it's a plain URL that could be replaced with title (inline onebox)
        const isPlainUrl = linkText === href || 
                           linkText === href.replace(/^https?:\/\//, '') ||
                           linkText.trim() === '' ||
                           linkText === href.replace(/^https?:\/\/www\./, '');
        
        // Inline onebox: Show title instead of URL if available (Discourse behavior)
        if (metadata?.title && isPlainUrl) {
          return (
            <TouchableOpacity
              onPress={() => renderLink.onPress(undefined, href)}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}
            >
              {metadata.favicon && (
                <Image
                  source={{ uri: metadata.favicon }}
                  style={{ 
                    width: 14, 
                    height: 14, 
                    marginRight: 6,
                    borderRadius: 2,
                  }}
                  contentFit="cover"
                />
              )}
              <Text
                style={{
                  color: tokens.colors.accent,
                  fontWeight: '500',
                  textDecorationLine: 'underline',
                  textDecorationColor: tokens.colors.accent + '40',
                }}
              >
                {metadata.title}
              </Text>
            </TouchableOpacity>
          );
        }
        
        // Regular link - make it pressable
        // Render Text directly with onPress to maintain inline text flow
        // TDefaultRenderer would render Text, so we render Text directly to avoid nesting
        return (
          <Text
            onPress={() => renderLink.onPress(undefined, href)}
            style={{
              color: tokens.colors.accent,
              textDecorationLine: 'underline',
              textDecorationColor: tokens.colors.accent + '40',
            }}
          >
            <TNodeChildrenRenderer tnode={tnode} />
          </Text>
        );
      },
      div: (props: any) => {
        const { tnode, TDefaultRenderer } = props;
        const className = tnode?.attributes?.class || '';
        const classList = className.split(' ');
        const isVideoOnebox =
          classList.includes('lazy-video-container') ||
          classList.includes('youtube-onebox') ||
          classList.includes('video-onebox');

        if (!isVideoOnebox) {
          return <TDefaultRenderer {...props} />;
        }

        const providerName = tnode?.attributes?.['data-provider-name'];
        const rawVideoId = tnode?.attributes?.['data-video-id'];
        const rawTitle = tnode?.attributes?.['data-video-title'];
        const rawStart = tnode?.attributes?.['data-video-start-time'];
        const href = findFirstHref(tnode);
        const startSeconds = parseVideoStartTime(rawStart);
        const embedUrl = buildVideoEmbedUrl({
          providerName,
          videoId: rawVideoId,
          href,
          startSeconds,
        });

        if (!embedUrl) {
          return <TDefaultRenderer {...props} />;
        }

        return (
          <TDefaultRenderer {...props} style={[props.style, { marginVertical: 10 }]}>
            <View
              style={{
                width: '100%',
                aspectRatio: 16 / 9,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: tokens.colors.surfaceMuted,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              <LazyVideoEmbed 
                embedUrl={embedUrl}
                baseTextColor={baseTextColor}
                tokens={tokens}
                lazyLoad={lazyLoadVideos}
              />
            </View>
            {rawTitle ? (
              <Text style={{ color: baseTextColor, fontSize: 14, marginTop: 8 }}>
                {rawTitle}
              </Text>
            ) : null}
          </TDefaultRenderer>
        );
      },
      img: ({ tnode }: any) => {
        const attrs = tnode?.attributes || {};
        const src = attrs.src;
        if (!src) return null;
        const alt = attrs.alt || 'Post image';
        const widthAttr = Number(attrs.width);
        const heightAttr = Number(attrs.height);
        const hasExplicitSize = widthAttr > 0 && heightAttr > 0 && widthAttr <= 200 && heightAttr <= 200;
        const aspectRatio =
          widthAttr > 0 && heightAttr > 0
            ? widthAttr / heightAttr
            : 16 / 9;

        return (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              // TODO: hook up lightbox once design is ready
            }}
            style={{
              marginVertical: hasExplicitSize ? 6 : 12,
              borderRadius: hasExplicitSize ? 6 : 8,
              overflow: 'hidden',
              alignSelf: hasExplicitSize ? 'flex-start' : 'stretch',
            }}
          >
            <Image
              source={{ uri: src }}
              style={
                hasExplicitSize
                  ? { width: widthAttr, height: heightAttr }
                  : { width: '100%', aspectRatio }
              }
              contentFit="cover"
              transition={200}
              accessibilityLabel={alt}
            />
          </TouchableOpacity>
        );
      },
      pre: ({ tnode }: any) => {
        const code = tnode?.textContent || '';
        return (
          <View
            style={{
              backgroundColor: tokens.colors.surfaceMuted,
              borderColor: tokens.colors.border,
              borderWidth: 1,
              borderRadius: 10,
              padding: 12,
              marginVertical: 12,
            }}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text
                style={{
                  color: baseTextColor,
                  fontFamily: codeFont,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {code}
              </Text>
            </ScrollView>
          </View>
        );
      },
      details: (props: any) => {
        const { tnode, TNodeChildrenRenderer } = props;
        return (
          <DetailsRenderer 
            tnode={tnode} 
            TNodeChildrenRenderer={TNodeChildrenRenderer}
            tokens={tokens}
          />
        );
      },
      summary: () => {
        // Summary content is extracted and rendered in details renderer
        // This prevents double-rendering of summary text
        return null;
      },
    }),
    [baseTextColor, codeFont, isDark, oneboxContainerStyle, renderLink, tokens, linkMetadata]
  );

  // Styles for HTML tags (cooked content)
  const tagsStyles = useMemo(
    () => ({
      body: {
        color: baseTextColor,
        backgroundColor: 'transparent',
      },
      div: {
        color: baseTextColor,
        backgroundColor: 'transparent',
      },
      span: {
        // Don't override color - allow inline styles to work
        // backgroundColor will be handled by inline styles if present
        backgroundColor: 'transparent',
      },
      // Paragraph styles: use reading mode typography if enabled, otherwise default
      p: readingMode ? {
        fontSize: 19,
        lineHeight: 32,
        color: baseTextColor,
        marginTop: 0,
        marginBottom: 24,
        paddingHorizontal: 0,
        letterSpacing: 0.2,
      } : markdownStyles.paragraph,
      h1: readingMode ? {
        ...markdownStyles.heading1,
        fontSize: 36,
        lineHeight: 44,
        marginTop: 40,
        marginBottom: 20,
        fontWeight: '800' as const,
      } : markdownStyles.heading1,
      h2: readingMode ? {
        ...markdownStyles.heading2,
        fontSize: 28,
        lineHeight: 36,
        marginTop: 36,
        marginBottom: 16,
        fontWeight: '700' as const,
      } : markdownStyles.heading2,
      h3: readingMode ? {
        ...markdownStyles.heading3,
        fontSize: 22,
        lineHeight: 30,
        marginTop: 28,
        marginBottom: 14,
        fontWeight: '600' as const,
      } : markdownStyles.heading3,
      h4: markdownStyles.heading4,
      h5: markdownStyles.heading5,
      h6: markdownStyles.heading6,
      font: {
        // Don't override color - allow inline styles to work
        // Inline color styles from Discourse will be preserved
      },
      ul: markdownStyles.listUnordered,
      ol: markdownStyles.listOrdered,
      li: markdownStyles.listItem,
      code: markdownStyles.code_inline,
      pre: markdownStyles.code_block,
      blockquote: markdownStyles.blockquote,
      a: {
        ...markdownStyles.link,
        fontWeight: '500' as const, // Ensure consistent weight
      },
      strong: markdownStyles.strong,
      em: markdownStyles.em,
      hr: markdownStyles.hr,
      img: markdownStyles.image,
      table: markdownStyles.table,
      thead: markdownStyles.thead,
      tbody: markdownStyles.tbody,
      th: markdownStyles.th,
      td: markdownStyles.td,
    }),
    [baseTextColor, markdownStyles]
  );

  // Raw markdown path: keep existing markdown renderer for bios / previews
  if (isRawMarkdown) {
    return (
      <View style={{ paddingHorizontal: 0 }}>
        <Markdown
          style={markdownStyles}
          rules={{
            link: (node: any, children: any, parent: any, styles: any) => {
              const url = node.attributes?.href;
              return (
                <Text
                  key={node.key}
                  style={styles.link}
                  onPress={() => {
                    if (url) {
                      renderLink.onPress?.(undefined, url);
                    }
                  }}
                >
                  {children}
                </Text>
              );
            },
            image: (node: any, children: any, parent: any, styles: any) => {
              const src = node.attributes?.src;
              if (!src) return null;
              const widthAttr = Number(node.attributes?.width);
              const heightAttr = Number(node.attributes?.height);
              const hasExplicitSize = widthAttr > 0 && heightAttr > 0 && widthAttr <= 200 && heightAttr <= 200;
              return (
                <TouchableOpacity
                  key={node.key}
                  activeOpacity={0.9}
                  onPress={() => {}}
                  style={[
                    styles.image,
                    hasExplicitSize && { width: widthAttr, height: heightAttr, marginVertical: 6, alignSelf: 'flex-start' },
                  ]}
                >
                  <Image
                    source={{ uri: src }}
                    style={
                      hasExplicitSize
                        ? { width: widthAttr, height: heightAttr }
                        : { width: '100%', aspectRatio: 16 / 9, resizeMode: 'cover' }
                    }
                    contentFit="cover"
                    transition={200}
                    accessibilityLabel="Markdown image"
                  />
                </TouchableOpacity>
              );
            },
          }}
          mergeStyle={false}
        >
          {content}
        </Markdown>
      </View>
    );
  }

  // Cooked HTML path: render directly without brittle conversion
  return (
    <RenderHTML
      contentWidth={contentWidth}
      source={{ html: content || '' }}
      enableCSSInlineProcessing={true} // Enable inline CSS for colored text support
      baseStyle={{
        color: baseTextColor, // Default color, can be overridden by inline styles
        lineHeight: readingMode ? 32 : 24,
        fontSize: readingMode ? 19 : 16,
        letterSpacing: readingMode ? 0.2 : 0,
      }}
      // Allow color and backgroundColor from inline styles, but control other styles
      ignoredStyles={[
        // Removed 'color' and 'backgroundColor' to allow colored text
        'fontFamily', // Keep app font family
        'fontSize', // Keep consistent sizing (or allow if needed)
        'fontWeight', // Keep consistent weight (or allow if needed)
        'fontStyle', // Keep consistent style (or allow if needed)
        'textAlign', // Keep consistent alignment (or allow if needed)
        'lineHeight', // Keep consistent line height
        'letterSpacing', // Keep consistent letter spacing
      ]}
      // Default text props - inline styles will override this color
      defaultTextProps={{ selectable: false, style: { color: baseTextColor } }}
      tagsStyles={tagsStyles}
      classesStyles={classesStyles as any}
      renderers={{
        ...htmlRenderers,
        // Only override paragraph renderer if reading mode is enabled
        ...(readingMode && htmlRenderers.p ? { p: htmlRenderers.p } : {}),
      } as any}
      renderersProps={{
        a: {
          onPress: (_event: any, href: string) => renderLink.onPress?.(_event, href),
        },
      }}
      // Note: Custom 'a' renderer handles onPress internally, but renderersProps
      // is kept for fallback cases
      customHTMLElementModels={{
        // Ensure pre stays block-level with inline children (code)
        pre: HTMLElementModel.fromCustomModel({
          tagName: 'pre',
          contentModel: HTMLContentModel.block,
        }),
        // Support Discourse spoilers/details (BBCode [spoiler] and [details])
        details: HTMLElementModel.fromCustomModel({
          tagName: 'details',
          contentModel: HTMLContentModel.block,
        }),
        summary: HTMLElementModel.fromCustomModel({
          tagName: 'summary',
          contentModel: HTMLContentModel.block,
        }),
      }}
    />
  );
}

// Memoize MarkdownContent to prevent unnecessary re-renders
export const MarkdownContent = memo(MarkdownContentComponent, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.isRawMarkdown === nextProps.isRawMarkdown &&
    prevProps.lazyLoadVideos === nextProps.lazyLoadVideos
  );
});
MarkdownContent.displayName = 'MarkdownContent';

function parseVideoStartTime(raw?: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  const match = trimmed.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (!match) return null;
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = match[2] ? Number(match[2]) : 0;
  const seconds = match[3] ? Number(match[3]) : 0;
  const total = hours * 3600 + minutes * 60 + seconds;
  return Number.isNaN(total) || total <= 0 ? null : total;
}

function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([A-Za-z0-9_-]{6,})/i);
  return match ? match[1] : null;
}

function extractVimeoId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match ? match[1] : null;
}

function buildVideoEmbedUrl({
  providerName,
  videoId,
  href,
  startSeconds,
}: {
  providerName?: string;
  videoId?: string;
  href?: string | null;
  startSeconds?: number | null;
}): string | null {
  const provider = (providerName || '').toLowerCase();
  let id = videoId || '';

  if (!id && provider.includes('youtube')) {
    id = extractYouTubeId(href || '') || '';
  }
  if (!id && provider.includes('vimeo')) {
    id = extractVimeoId(href || '') || '';
  }

  if (provider.includes('youtube') && id) {
    const startParam = startSeconds ? `&start=${startSeconds}` : '';
    return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1${startParam}`;
  }
  if (provider.includes('vimeo') && id) {
    const startParam = startSeconds ? `#t=${startSeconds}s` : '';
    return `https://player.vimeo.com/video/${id}${startParam}`;
  }

  return href || null;
}

function buildVideoEmbedHtml(url: string): string {
  const escapedUrl = url.replace(/"/g, '&quot;');
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>
      html, body { margin: 0; padding: 0; background: transparent; height: 100%; }
      .frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe class="frame" src="${escapedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
  </body>
</html>`;
}

function toTitleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function findFirstHref(tnode: any): string | null {
  if (!tnode) return null;
  const attrs = tnode.attributes || {};
  if (attrs.href) return attrs.href;
  const children = Array.isArray(tnode.children) ? tnode.children : [];
  for (const child of children) {
    const found = findFirstHref(child);
    if (found) return found;
  }
  return null;
}

/**
 * Helper to extract summary text from details element
 * Used for rendering Discourse spoilers and details blocks
 */
function findSummaryText(tnode: any): string | null {
  if (!tnode || !tnode.children) return null;
  
  // Search for summary element in children
  const children = Array.isArray(tnode.children) ? tnode.children : [];
  for (const child of children) {
    if (child.tagName === 'summary') {
      // Extract text content from summary
      return extractTextContent(child);
    }
    // Recursively search in nested children
    const found = findSummaryText(child);
    if (found) return found;
  }
  
  return null;
}

/**
 * Extract text content from a tree node
 * Handles both text nodes and nested elements
 */
function extractTextContent(tnode: any): string {
  if (!tnode) return '';
  
  // If it's a text node, return the text
  if (tnode.type === 'text' && tnode.data) {
    return tnode.data.trim();
  }
  
  // If it has textContent, use that
  if (tnode.textContent) {
    return tnode.textContent.trim();
  }
  
  // Recursively extract from children
  if (tnode.children && Array.isArray(tnode.children)) {
    return tnode.children
      .map((child: any) => extractTextContent(child))
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  
  return '';
}

/**
 * Extract onebox URL from tree node
 * Checks data-url attribute first, then falls back to finding first href
 */
function extractOneboxUrl(tnode: any): string | null {
  if (!tnode) return null;
  
  // Check for data-url attribute (Discourse onebox standard)
  const attrs = tnode.attributes || {};
  if (attrs['data-url']) {
    return attrs['data-url'];
  }
  
  // Fallback to finding first href in children
  return findFirstHref(tnode);
}

/**
 * Extract onebox title from tree node
 * Finds .onebox-title element and extracts text content
 */
function extractOneboxTitle(tnode: any): string | null {
  if (!tnode || !tnode.children) return null;
  
  const children = Array.isArray(tnode.children) ? tnode.children : [];
  
  // Search for element with onebox-title class
  for (const child of children) {
    const className = child.attributes?.class || '';
    if (className.split(' ').includes('onebox-title')) {
      return extractTextContent(child);
    }
    // Recursively search in nested children
    const found = extractOneboxTitle(child);
    if (found) return found;
  }
  
  return null;
}

/**
 * Extract onebox image URL from tree node
 * Finds .onebox-image img element and gets src
 */
function extractOneboxImage(tnode: any): string | null {
  if (!tnode || !tnode.children) return null;
  
  const children = Array.isArray(tnode.children) ? tnode.children : [];
  
  // Search for element with onebox-image class
  for (const child of children) {
    const className = child.attributes?.class || '';
    if (className.split(' ').includes('onebox-image')) {
      // Look for img tag within onebox-image
      if (child.children) {
        for (const imgChild of child.children) {
          if (imgChild.tagName === 'img' && imgChild.attributes?.src) {
            return imgChild.attributes.src;
          }
        }
      }
    }
    // Recursively search in nested children
    const found = extractOneboxImage(child);
    if (found) return found;
  }
  
  return null;
}

/**
 * Extract onebox site name from tree node
 * Finds .onebox-site-name element and extracts text content
 */
function extractOneboxSiteName(tnode: any): string | null {
  if (!tnode || !tnode.children) return null;
  
  const children = Array.isArray(tnode.children) ? tnode.children : [];
  
  // Search for element with onebox-site-name class
  for (const child of children) {
    const className = child.attributes?.class || '';
    if (className.split(' ').includes('onebox-site-name')) {
      return extractTextContent(child);
    }
    // Recursively search in nested children
    const found = extractOneboxSiteName(child);
    if (found) return found;
  }
  
  return null;
}
