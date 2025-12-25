import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Linking, ScrollView, useWindowDimensions, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import RenderHTML, { HTMLContentModel, HTMLElementModel } from 'react-native-render-html';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/components/theme';
import { getMarkdownStyles } from '@/shared/markdown-styles';
import * as WebBrowser from 'expo-web-browser';
import { getThemeColors } from '@/shared/theme-constants';

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
}

// UI Spec: MarkdownContent — Renders Discourse cooked HTML or raw markdown with full fidelity
// - Supports headings, paragraphs, lists, code, quotes, links, images, tables, HRs
// - Themed with Fomio semantic tokens
// - Links open in in-app browser
// - Images use expo-image and are tappable (lightbox-ready)
export function MarkdownContent({
  content,
  isRawMarkdown = false,
  linkMetadata: _linkMetadata,
}: MarkdownContentProps) {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const markdownStyles = useMemo(() => getMarkdownStyles(isDark), [isDark]);
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);
  const contentWidth = Math.max(320, width - 32); // keep nice margins even on small screens
  const baseTextColor = isDark ? '#F5F5F7' : colors.foreground;
  const codeFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

  const oneboxContainerStyle = useMemo(
    () => ({
      marginVertical: 10,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    }),
    [colors]
  );

  const classesStyles = useMemo(
    () => ({
      onebox: {
        marginVertical: 0,
      },
      source: {
        color: colors.secondary,
        fontSize: 12,
        marginBottom: 6,
      },
      'onebox-body': {
        marginTop: 4,
      },
      'onebox-title': {
        color: baseTextColor,
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 22,
        marginBottom: 6,
      },
      'onebox-site-name': {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '600',
      },
      'onebox-image': {
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: 8,
      },
      'onebox-avatar': {
        borderRadius: 8,
        overflow: 'hidden',
      },
    }),
    [baseTextColor, colors]
  );

  // Renderer for links (shared across HTML and markdown paths)
  const renderLink = useMemo(
    () => ({
      onPress: async (_event: any, href: string) => {
        if (!href) return;
        try {
          await WebBrowser.openBrowserAsync(href, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            controlsColor: isDark ? '#26A69A' : '#009688',
          });
        } catch {
          Linking.openURL(href).catch(() => {});
        }
      },
    }),
    [isDark]
  );

  // Custom renderers for RenderHTML (cooked HTML path)
  const htmlRenderers = useMemo(
    () => ({
      aside: (props: any) => {
        const { tnode, TDefaultRenderer, TNodeChildrenRenderer } = props;
        const className = tnode?.attributes?.class || '';
        const isOnebox = className.split(' ').includes('onebox');
        if (!isOnebox) {
          return <TDefaultRenderer {...props} />;
        }
        return (
          <TDefaultRenderer {...props} style={[props.style, oneboxContainerStyle]}>
            <TNodeChildrenRenderer tnode={tnode} />
          </TDefaultRenderer>
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
                backgroundColor: colors.muted,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
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
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              borderColor: colors.border,
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
    }),
    [baseTextColor, codeFont, colors, isDark, oneboxContainerStyle, renderLink]
  );

  // Styles for HTML tags (cooked content)
  const tagsStyles = useMemo(
    () => ({
      body: {
        color: baseTextColor,
        backgroundColor: 'transparent',
      },
      p: markdownStyles.paragraph,
      h1: markdownStyles.heading1,
      h2: markdownStyles.heading2,
      h3: markdownStyles.heading3,
      h4: markdownStyles.heading4,
      h5: markdownStyles.heading5,
      h6: markdownStyles.heading6,
      ul: markdownStyles.listUnordered,
      ol: markdownStyles.listOrdered,
      li: markdownStyles.listItem,
      code: markdownStyles.code_inline,
      pre: markdownStyles.code_block,
      blockquote: markdownStyles.blockquote,
      a: markdownStyles.link,
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
      baseStyle={{
        color: baseTextColor,
        lineHeight: 24,
        fontSize: 16,
      }}
      defaultTextProps={{ selectable: false }}
      tagsStyles={tagsStyles}
      classesStyles={classesStyles as any}
      renderers={htmlRenderers as any}
      renderersProps={{
        a: {
          onPress: (_event: any, href: string) => renderLink.onPress?.(_event, href),
        },
      }}
      customHTMLElementModels={{
        // Ensure pre stays block-level with inline children (code)
        pre: HTMLElementModel.fromCustomModel({
          tagName: 'pre',
          contentModel: HTMLContentModel.block,
        }),
      }}
    />
  );
}

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
