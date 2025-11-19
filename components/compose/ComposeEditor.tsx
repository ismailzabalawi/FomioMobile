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
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: body.length,
    end: body.length,
  });

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

  // Helper: wrap selection or insert inline wrapper (e.g. bold/italic)
  const applyInlineWrap = useCallback(
    (currentBody: string, sel: { start: number; end: number }, wrapper: string) => {
      const { start, end } = sel;

      if (start !== end) {
        // Wrap selected text
        const before = currentBody.slice(0, start);
        const middle = currentBody.slice(start, end);
        const after = currentBody.slice(end);

        const next = `${before}${wrapper}${middle}${wrapper}${after}`;
        const newStart = start + wrapper.length;
        const newEnd = newStart + middle.length;

        onChangeBody(next);
        setSelection({ start: newStart, end: newEnd });
      } else {
        // No selection: insert wrapperwrapper and place cursor in the middle
        const before = currentBody.slice(0, start);
        const after = currentBody.slice(end);
        const snippet = `${wrapper}${wrapper}`;

        const next = before + snippet + after;
        const cursor = before.length + wrapper.length;

        onChangeBody(next);
        setSelection({ start: cursor, end: cursor });
      }
    },
    [onChangeBody],
  );

  const applyBold = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyInlineWrap(currentBody, sel, '**');
    },
    [applyInlineWrap],
  );

  const applyItalic = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyInlineWrap(currentBody, sel, '_');
    },
    [applyInlineWrap],
  );

  // Helper: apply prefix to the current line (for headings, quote, list)
  const applyLinePrefix = useCallback(
    (currentBody: string, sel: { start: number; end: number }, prefix: string) => {
      const { start } = sel;

      const before = currentBody.slice(0, start);
      const after = currentBody.slice(start);

      const lastNewline = before.lastIndexOf('\n');
      const lineStartIndex = lastNewline === -1 ? 0 : lastNewline + 1;

      const lineRest = currentBody.slice(lineStartIndex);
      const firstNewline = lineRest.indexOf('\n');
      const lineEndIndex =
        firstNewline === -1 ? currentBody.length : lineStartIndex + firstNewline;

      const line = currentBody.slice(lineStartIndex, lineEndIndex);

      // Keep leading spaces, then add prefix
      const leadingSpacesMatch = line.match(/^\s*/);
      const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[0] : '';
      const rest = line.slice(leadingSpaces.length);

      const newLine = leadingSpaces + prefix + rest;

      const next =
        currentBody.slice(0, lineStartIndex) + newLine + currentBody.slice(lineEndIndex);

      const newCursor = start + prefix.length;

      onChangeBody(next);
      setSelection({ start: newCursor, end: newCursor });
    },
    [onChangeBody],
  );

  const applyH1 = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyLinePrefix(currentBody, sel, '# ');
    },
    [applyLinePrefix],
  );

  const applyH2 = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyLinePrefix(currentBody, sel, '## ');
    },
    [applyLinePrefix],
  );

  const applyQuote = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyLinePrefix(currentBody, sel, '> ');
    },
    [applyLinePrefix],
  );

  const applyList = useCallback(
    (currentBody: string, sel: { start: number; end: number }) => {
      applyLinePrefix(currentBody, sel, '- ');
    },
    [applyLinePrefix],
  );

  // Detect and handle slash commands
  const handleBodyChange = useCallback(
    (text: string) => {
      const lines = text.split('\n');
      const lastLineIndex = lines.length - 1;
      const lastLine = lines[lastLineIndex] ?? '';

      // Find a slash command at the end of the line
      const match = lastLine.match(/(?:^|\s)(\/[a-zA-Z0-9]+)\s*$/);
      const command = match?.[1]; // e.g. "/b", "/h1", "/quote"

      if (command) {
        // Remove the matched part (including leading space) from the line
        const lineWithoutCommand = lastLine.slice(0, lastLine.length - match[0].length);
        lines[lastLineIndex] = lineWithoutCommand;
        const clean = lines.join('\n'); // body without the /command token

        // Calculate command position in the original text
        const commandLength = match[0].length;
        const commandStartPos = text.length - commandLength;
        const commandEndPos = text.length;

        // Adjust selection to account for removed command
        let adjustedStart = selection.start;
        let adjustedEnd = selection.end;

        if (selection.start >= commandEndPos) {
          // Cursor was after the command, move it back
          adjustedStart = selection.start - commandLength;
          adjustedEnd = selection.end - commandLength;
        } else if (selection.end > commandStartPos) {
          // Selection overlaps with command area
          if (selection.start >= commandStartPos) {
            // Entire selection was in the command, place cursor at removal point
            adjustedStart = commandStartPos;
            adjustedEnd = commandStartPos;
          } else {
            // Selection starts before but extends into command, clamp end to command start
            adjustedEnd = commandStartPos;
          }
        }

        const adjustedSel = { start: adjustedStart, end: adjustedEnd };
        setSelection(adjustedSel);

        switch (command) {
          case '/help':
            if (onSlashHelp) {
              if (__DEV__) {
                console.log('🔍 [ComposeEditor] /help detected! Calling onSlashHelp');
              }
              onChangeBody(clean);
              onSlashHelp();
            }
            return;

          case '/image':
            if (onSlashImage) {
              onChangeBody(clean);
              onSlashImage();
            }
            return;

          case '/b':
          case '/bold':
            applyBold(clean, adjustedSel);
            return;

          case '/i':
          case '/italic':
            applyItalic(clean, adjustedSel);
            return;

          case '/h1':
            applyH1(clean, adjustedSel);
            return;

          case '/h2':
            applyH2(clean, adjustedSel);
            return;

          case '/quote':
            applyQuote(clean, adjustedSel);
            return;

          case '/list':
            applyList(clean, adjustedSel);
            return;
        }
      }

      // No command matched → normal update
      onChangeBody(text);
    },
    [
      onChangeBody,
      onSlashHelp,
      onSlashImage,
      applyBold,
      applyItalic,
      applyH1,
      applyH2,
      applyQuote,
      applyList,
      selection,
    ],
  );

  // Helper for inserting text at cursor position (for future formatting features)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const insertAtCursor = useCallback(
    (snippet: string) => {
      const { start, end } = selection;
      const before = body.slice(0, start);
      const after = body.slice(end);
      const next = before + snippet + after;
      const newPos = before.length + snippet.length;
      onChangeBody(next);
      setSelection({ start: newPos, end: newPos });
    },
    [body, selection, onChangeBody],
  );

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
              setBodyHeight(Math.max(h, 120));
            }}
            selection={selection}
            onSelectionChange={(e) => {
              setSelection(e.nativeEvent.selection);
            }}
            style={{
              fontSize: 17,
              lineHeight: 24,
              minHeight: 120,
              flexGrow: 1,
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

