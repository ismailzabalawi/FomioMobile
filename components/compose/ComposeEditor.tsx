// UI Spec: ComposeEditor
// - Auto-expanding TextInput for content (multiline, min 120px height)
// - Minimal inline title TextInput above content area
// - Uses NativeWind classes with semantic tokens
// - Placeholder: "Write your Byte..." for content
// - Placeholder: "Title" for title field
// - Inline validation error display

import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useTheme } from '@/components/theme';
import { cn } from '@/lib/utils/cn';
import { Warning } from 'phosphor-react-native';

interface ComposeEditorProps {
  title: string;
  content: string;
  onTitleChange: (text: string) => void;
  onContentChange: (text: string) => void;
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
          placeholder="Title"
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

      {/* Content Input - Large, auto-expanding, editor-first */}
      <View className="flex-1">
        <TextInput
          className="text-body text-fomio-foreground dark:text-fomio-foreground-dark rounded-fomio-card px-5 py-5"
          placeholder="Write your Byte..."
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

