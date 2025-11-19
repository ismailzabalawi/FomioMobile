// UI Spec: ComposeEditor
// - Auto-expanding TextInput for body (multiline, min 120px height)
// - Minimal inline title TextInput above content area
// - Teret row between title and body (simple, tappable row)
// - Uses NativeWind classes with semantic tokens
// - Placeholder: "Start writing…" for body
// - Placeholder: "Add title" for title field
// - Phase 1: Slash commands (/help, /image) with callback props
// - Phase 3: Write/Preview toggle with Markdown renderer

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Keyboard } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { CaretRight } from 'phosphor-react-native';
import { Teret } from '@/shared/useTerets';
import { getMarkdownStyles } from '@/shared/markdown-styles';

type EditorMode = 'write' | 'preview';

interface ComposeEditorProps {
  title: string;
  body: string;
  onChangeTitle: (text: string) => void;
  onChangeBody: (text: string) => void;
  selectedTeret: Teret | null;
  onTeretPress: () => void;
  onSlashHelp?: () => void;
  onSlashImage?: () => void;
}

export function ComposeEditor({
  title,
  body,
  onChangeTitle,
  onChangeBody,
  selectedTeret,
  onTeretPress,
  onSlashHelp,
  onSlashImage,
}: ComposeEditorProps) {
  const { isDark } = useTheme();
  const [bodyHeight, setBodyHeight] = useState(120);
  const [mode, setMode] = useState<EditorMode>('write');

  // Editor-first background: translucent, light weight
  const inputBg = isDark ? 'rgba(5, 5, 5, 0.6)' : 'rgba(255, 255, 255, 0.7)';

  // Markdown styles for preview mode (shared with MarkdownContent)
  const markdownStyles = useMemo(() => getMarkdownStyles(isDark), [isDark]);

  // Image renderer for preview (prevents key prop spread warning from internal FitImage)
  const markdownRenderers = useMemo(() => ({
    image: (node: any, children: any, parent: any, styles: any) => {
      const src = node.attributes?.src;
      if (!src) return null;
      
      return (
        <TouchableOpacity
          key={node.key}
          activeOpacity={0.9}
          onPress={() => {
            // Preview mode - images are view-only for now
            if (__DEV__) console.log('Preview image tapped:', src);
          }}
          style={styles.image}
        >
          <Image
            source={{ uri: src }}
            style={{
              width: '100%',
              minHeight: 200,
            }}
            contentFit="contain"
            transition={200}
            accessibilityLabel="Post image"
          />
        </TouchableOpacity>
      );
    },
  }), []);

  // Detect and handle slash commands
  const handleBodyChange = useCallback((text: string) => {
    // Check for slash commands at the start of a line
    const lines = text.split('\n');
    const lastLineIndex = lines.length - 1;
    const lastLine = lines[lastLineIndex];
    const trimmed = lastLine.trimStart(); // Preserve leading spaces if needed

    // Only process if last line starts with a slash command
    if (trimmed === '/help' && onSlashHelp) {
      if (__DEV__) console.log('🔍 [ComposeEditor] /help detected! Calling onSlashHelp');
      // Remove command from last line (set to empty string)
      lines[lastLineIndex] = '';
      onChangeBody(lines.join('\n'));
      onSlashHelp();
      return;
    }

    if (trimmed === '/image' && onSlashImage) {
      // Remove command from last line (set to empty string)
      lines[lastLineIndex] = '';
      onChangeBody(lines.join('\n'));
      onSlashImage();
      return;
    }

    // No command matched, update normally
    onChangeBody(text);
  }, [onChangeBody, onSlashHelp, onSlashImage]);

  return (
    <View className="flex-1 px-4">
      {/* Title Input - Minimal inline, editor-first styling */}
      <View className="mb-3">
        <TextInput
          className="text-body text-fomio-foreground dark:text-fomio-foreground-dark rounded-fomio-card px-5 py-4"
          placeholder="Add title"
          placeholderTextColor="rgba(161, 161, 170, 0.8)"
          value={title}
          onChangeText={onChangeTitle}
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

      {/* Write/Preview Toggle */}
      <View className="flex-row mb-2 gap-2">
        <TouchableOpacity
          className={`px-3 py-1 rounded-full ${
            mode === 'write'
              ? 'bg-fomio-accent/10 dark:bg-fomio-accent-dark/10'
              : 'bg-transparent'
          }`}
          onPress={() => setMode('write')}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Switch to write mode"
        >
          <Text
            className={
              mode === 'write'
                ? 'text-caption font-semibold text-fomio-accent dark:text-fomio-accent-dark'
                : 'text-caption text-fomio-muted dark:text-fomio-muted-dark'
            }
          >
            Write
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`px-3 py-1 rounded-full ${
            mode === 'preview'
              ? 'bg-fomio-accent/10 dark:bg-fomio-accent-dark/10'
              : 'bg-transparent'
          }`}
          onPress={() => {
            setMode('preview');
            Keyboard.dismiss();
          }}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Switch to preview mode"
        >
          <Text
            className={
              mode === 'preview'
                ? 'text-caption font-semibold text-fomio-accent dark:text-fomio-accent-dark'
                : 'text-caption text-fomio-muted dark:text-fomio-muted-dark'
            }
          >
            Preview
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body Input or Preview - Full height */}
      <View className="flex-1">
        {mode === 'write' ? (
          <TextInput
            className="text-body text-fomio-foreground dark:text-fomio-foreground-dark rounded-fomio-card px-5 py-5"
            placeholder="Start writing…"
            placeholderTextColor="rgba(161, 161, 170, 0.8)"
            value={body}
            onChangeText={handleBodyChange}
            multiline
            textAlignVertical="top"
            accessible
            accessibilityLabel="Post body input"
            onContentSizeChange={(e) => {
              const h = e.nativeEvent.contentSize.height;
              setBodyHeight(Math.min(Math.max(h, 120), 600));
            }}
            style={{
              fontSize: 17,
              lineHeight: 24,
              minHeight: 120,
              height: bodyHeight,
              backgroundColor: inputBg,
            }}
          />
        ) : (
          <ScrollView
            className="flex-1 rounded-fomio-card px-5 py-5 bg-fomio-card dark:bg-fomio-card-dark"
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            <Markdown 
              style={markdownStyles} 
              mergeStyle={true}
              rules={markdownRenderers}
            >
              {body || '_Nothing to preview yet._'}
            </Markdown>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

