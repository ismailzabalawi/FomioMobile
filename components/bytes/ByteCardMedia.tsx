import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import type { Byte } from '@/types/byte';

/**
 * ByteCardMedia - Handles images and link previews
 * 
 * UI Spec:
 * - Images: full-width, rounded-xl, h-56 (224px), cover mode
 * - Link previews: border, rounded-xl, optional image header
 * - Spacing: mt-3 from content
 * - Future: video support, gallery for multiple images
 */
export function ByteCardMedia({ byte }: { byte: Byte }) {
  const { media, linkPreview } = byte;

  // Image post
  if (media && media.length > 0) {
    return (
      <View className="mt-3">
        <Image
          source={{ uri: media[0] }}
          className="w-full rounded-xl"
          style={{ height: 224 }}
          contentFit="cover"
          transition={200}
          accessibilityLabel="Post image"
        />
      </View>
    );
  }

  // Link preview (structure defined but not fully wired yet)
  if (linkPreview) {
    const handleLinkPress = async () => {
      try {
        await WebBrowser.openBrowserAsync(linkPreview.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        });
      } catch (error) {
        Linking.openURL(linkPreview.url).catch(() => {});
      }
    };

    return (
      <Pressable
        onPress={handleLinkPress}
        className="mt-3 border border-fomio-border-soft dark:border-fomio-border-soft-dark rounded-xl overflow-hidden active:opacity-90"
      >
        {linkPreview.image && (
          <Image
            source={{ uri: linkPreview.image }}
            className="w-full"
            style={{ height: 176 }}
            contentFit="cover"
            transition={200}
            accessibilityLabel="Link preview image"
          />
        )}
        <View className="p-3">
          <Text className="font-semibold text-base text-fomio-foreground dark:text-fomio-foreground-dark">
            {linkPreview.title}
          </Text>
          {linkPreview.description && (
            <Text
              className="text-caption text-fomio-muted dark:text-fomio-muted-dark mt-1"
              numberOfLines={2}
            >
              {linkPreview.description}
            </Text>
          )}
          <Text className="mt-2 text-fomio-primary dark:text-fomio-primary-dark text-caption">
            {linkPreview.url}
          </Text>
        </View>
      </Pressable>
    );
  }

  return null;
}

