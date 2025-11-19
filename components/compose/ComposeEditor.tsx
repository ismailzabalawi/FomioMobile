// UI Spec: ComposeEditor
// - Auto-expanding TextInput for content (multiline, min 120px height)
// - Minimal inline title TextInput above content area
// - Teret row between title and body (simple, tappable row)
// - Uses NativeWind classes with semantic tokens
// - Placeholder: "Start writing…" for content
// - Placeholder: "Add title" for title field
// - Inline validation error display

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '@/components/theme';
import { cn } from '@/lib/utils/cn';
import { Warning, CaretRight } from 'phosphor-react-native';
import { Teret } from '@/shared/useTerets';

interface ComposeEditorProps {
  title: string;
  content: string;
  onTitleChange: (text: string) => void;
  onContentChange: (text: string) => void;
  selectedTeret: Teret | null;
  onTeretPress: () => void;
  titleError?: string;
  contentError?: string;
  minTitle: number;
  minContent: number;
}

export function ComposeEditor({
  title,
  content,
  onTitleChange,
  onContentChange,
  selectedTeret,
  onTeretPress,
  titleError,
  contentError,
  minTitle,
  minContent,
}: ComposeEditorProps) {
  const { isDark } = useTheme();
  const [contentHeight, setContentHeight] = useState(120);

  // Editor-first background: translucent, light weight
  const inputBg = isDark ? 'rgba(5, 5, 5, 0.6)' : 'rgba(255, 255, 255, 0.7)';

  return (
    <View className="flex-1 px-4">
      {/* Title Input - Minimal inline, editor-first styling */}
      <View className="mb-3">
        <TextInput
          className="text-body text-fomio-foreground dark:text-fomio-foreground-dark rounded-fomio-card px-5 py-4"
          placeholder="Add title"
          placeholderTextColor="rgba(161, 161, 170, 0.8)"
          value={title}
          onChangeText={onTitleChange}
          maxLength={255}
          accessible
          accessibilityLabel="Post title input"
          style={{
            fontSize: 17,
            lineHeight: 24,
            minHeight: 50,
            backgroundColor: inputBg,
          }}
        />
        {titleError ? (
          <View className="flex-row items-center mt-2">
            <Warning size={14} color="#EF4444" weight="regular" />
            <Text className="text-caption text-fomio-danger dark:text-fomio-danger-dark ml-2">
              {titleError}
            </Text>
          </View>
        ) : (
          title.length > 0 && (
            <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark mt-1 text-right opacity-60">
              {title.length}/255 • min {minTitle}
            </Text>
          )
        )}
      </View>

      {/* Teret Row - Simple, minimal row between title and body */}
      <TouchableOpacity
        className="mb-3 py-3 flex-row items-center justify-between"
        onPress={onTeretPress}
        activeOpacity={0.7}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          selectedTeret === null
            ? 'Choose Teret'
            : `Change Teret. Current Teret: ${selectedTeret.name}`
        }
      >
        <Text
          className={
            selectedTeret === null
              ? 'text-body text-fomio-muted dark:text-fomio-muted-dark'
              : 'text-body text-fomio-foreground dark:text-fomio-foreground-dark'
          }
        >
          {selectedTeret === null ? (
            'Choose Teret'
          ) : (
            <>
              In: <Text className="font-semibold">{selectedTeret.name}</Text>
            </>
          )}
        </Text>
        <CaretRight
          size={16}
          color={isDark ? '#A1A1AA' : '#6B6B72'}
          weight="regular"
        />
      </TouchableOpacity>

      {/* Content Input - Large, auto-expanding, editor-first */}
      <View className="flex-1">
        <TextInput
          className="text-body text-fomio-foreground dark:text-fomio-foreground-dark rounded-fomio-card px-5 py-5"
          placeholder="Start writing…"
          placeholderTextColor="rgba(161, 161, 170, 0.8)"
          value={content}
          onChangeText={onContentChange}
          multiline
          textAlignVertical="top"
          accessible
          accessibilityLabel="Post content input"
          onContentSizeChange={(e) => {
            const h = e.nativeEvent.contentSize.height;
            setContentHeight(Math.min(Math.max(h, 120), 600));
          }}
          style={{
            fontSize: 17,
            lineHeight: 24,
            minHeight: 120,
            height: contentHeight,
            backgroundColor: inputBg,
          }}
        />
        {contentError ? (
          <View className="flex-row items-center mt-2">
            <Warning size={14} color="#EF4444" weight="regular" />
            <Text className="text-caption text-fomio-danger dark:text-fomio-danger-dark ml-2">
              {contentError}
            </Text>
          </View>
        ) : (
          content.length > 0 && (
            <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark mt-1 text-right opacity-60">
              {content.length} chars • min {minContent}
            </Text>
          )
        )}
      </View>
    </View>
  );
}

