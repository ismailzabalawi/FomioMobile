import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Linking, ScrollView, useWindowDimensions, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import RenderHTML, { HTMLContentModel, HTMLElementModel } from 'react-native-render-html';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { getMarkdownStyles } from '@/shared/markdown-styles';
import * as WebBrowser from 'expo-web-browser';
import { getThemeColors } from '@/shared/theme-constants';
import { LinkSimpleBreak } from 'phosphor-react-native';

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
export function MarkdownContent({ content, isRawMarkdown = false, linkMetadata }: MarkdownContentProps) {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const markdownStyles = useMemo(() => getMarkdownStyles(isDark), [isDark]);
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);
  const contentWidth = Math.max(320, width - 32); // keep nice margins even on small screens
  const baseTextColor = isDark ? '#F5F5F7' : colors.foreground;
  const codeFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

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
      a: ({ tnode }: any) => {
        const href = tnode?.attributes?.href;
        if (!href) return null;
        const label = (tnode?.data || tnode?.textContent || href).trim();
        const isStandalone =
          tnode?.parent?.tagName === 'p' &&
          Array.isArray(tnode?.parent?.children) &&
          tnode.parent.children.length === 1;

        if (isStandalone) {
          return (
            <LinkPreviewCard
              key={href}
              url={href}
              label={label}
              colors={colors}
              baseTextColor={baseTextColor}
              metadata={linkMetadata?.[href]}
              onPress={() => renderLink.onPress?.(undefined, href)}
            />
          );
        }

        return (
          <Text
            style={markdownStyles.link}
            onPress={(event) => renderLink.onPress?.(event, href)}
          >
            {label || href}
          </Text>
        );
      },
    }),
    [baseTextColor, codeFont, colors, isDark, markdownStyles.link, renderLink]
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
              const label = Array.isArray(children) ? children.join('') : url;
              const isStandalone =
                parent?.type === 'paragraph' &&
                Array.isArray(parent?.children) &&
                parent.children.length === 1;

              if (isStandalone && url) {
                return (
                  <LinkPreviewCard
                    key={node.key}
                    url={url}
                    label={label || url}
                    colors={colors}
                    baseTextColor={baseTextColor}
                    metadata={linkMetadata?.[url]}
                    onPress={() => renderLink.onPress?.(undefined, url)}
                  />
                );
              }

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

function LinkPreviewCard({
  url,
  label,
  colors,
  baseTextColor,
  onPress,
  metadata,
}: {
  url: string;
  label: string;
  colors: ReturnType<typeof getThemeColors>;
  baseTextColor: string;
  onPress?: () => void;
  metadata?: {
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    siteName?: string;
    publishedAt?: string;
    type?: 'article' | 'video' | 'post' | 'generic';
  };
}) {
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    host = url;
  }

  const isArticle = metadata?.type === 'article' || !!metadata?.description || !!metadata?.image;
  const titleText = metadata?.title || label || url;
  const descriptionText = metadata?.description;
  const timeAgo = formatTimeAgo(metadata?.publishedAt);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        if (onPress) {
          onPress();
          return;
        }
        // Fallback open
        Linking.openURL(url).catch(() => {});
      }}
      style={{
        marginVertical: 10,
        padding: isArticle ? 14 : 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <LinkSimpleBreak size={18} color={colors.accent} weight="bold" />
        {metadata?.favicon ? (
          <Image
            source={{ uri: metadata.favicon }}
            style={{ width: 18, height: 18, borderRadius: 4 }}
            contentFit="cover"
          />
        ) : null}
        <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
          {metadata?.siteName || host}
        </Text>
        {timeAgo ? (
          <Text style={{ color: colors.secondary, fontSize: 12 }} numberOfLines={1}>
            · {timeAgo}
          </Text>
        ) : null}
      </View>

      {isArticle ? (
        <>
          <Text
            numberOfLines={2}
            style={{ color: baseTextColor, fontSize: 16, lineHeight: 23, fontWeight: '700', marginBottom: 6 }}
          >
            {titleText}
          </Text>
          {descriptionText ? (
            <Text
              numberOfLines={3}
              style={{ color: colors.secondary, fontSize: 14, lineHeight: 20, marginBottom: metadata?.image ? 10 : 6 }}
            >
              {descriptionText}
            </Text>
          ) : null}
          {metadata?.image ? (
            <Image
              source={{ uri: metadata.image }}
              style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12 }}
              contentFit="cover"
              transition={150}
            />
          ) : null}
        </>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {metadata?.image ? (
            <Image
              source={{ uri: metadata.image }}
              style={{ width: 72, height: 72, borderRadius: 10 }}
              contentFit="cover"
              transition={150}
            />
          ) : null}

          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={2}
              style={{ color: baseTextColor, fontSize: 15, lineHeight: 22, fontWeight: '700' }}
            >
              {titleText}
            </Text>
            {descriptionText ? (
              <Text
                numberOfLines={2}
                style={{ color: colors.secondary, fontSize: 13, lineHeight: 18, marginTop: 4 }}
              >
                {descriptionText}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function formatTimeAgo(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}
