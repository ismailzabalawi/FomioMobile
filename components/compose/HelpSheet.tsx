// UI Spec: HelpSheet
// - Modal cheat sheet for slash commands
// - Uses React Native Modal (similar to TeretPickerSheet)
// - Shows available slash commands and their descriptions
// - Clean, simple layout using NativeWind tokens
// - Groups commands: Basics, Inline formatting, Headings & structure
// - Includes examples and usage patterns

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/components/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ImageSquare } from 'phosphor-react-native';

interface HelpSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function HelpSheet({ visible, onClose }: HelpSheetProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const maxSheetHeight = screenHeight * 0.9;

  const sectionTitleClass =
    'text-caption font-semibold text-fomio-muted dark:text-fomio-muted-dark mb-2';
  const commandRowClass = 'flex-row items-start py-6 border-b border-fomio-border-soft dark:border-fomio-border-soft-dark';
  const commandTextClass = 'text-body font-mono text-fomio-foreground dark:text-fomio-foreground-dark';
  const descriptionClass = 'text-caption text-fomio-muted dark:text-fomio-muted-dark mt-1';
  const exampleLabelClass = 'text-caption font-semibold text-fomio-muted dark:text-fomio-muted-dark mt-2';
  const exampleValueClass = 'text-caption font-mono text-fomio-foreground dark:text-fomio-foreground-dark mt-1';

  const sections = [
    {
      title: 'Basics',
      items: [
        {
          cmd: '/help',
          aliases: [],
          description: 'Show this help sheet.',
          example: 'Type: /help',
          icon: null,
        },
        {
          cmd: '/image',
          aliases: [],
          description:
            'Pick image(s), upload them to Fomio, and insert Markdown like `![image](url)` into your Byte.',
          example: 'Type: /image',
          icon: ImageSquare,
        },
      ],
    },
    {
      title: 'Inline formatting',
      items: [
        {
          cmd: '/b',
          aliases: ['/bold'],
          description:
            'Bold the selected text, or insert `**…**` at the cursor if nothing is selected.',
          example: 'Type: This is important /b',
          icon: null,
        },
        {
          cmd: '/i',
          aliases: ['/italic'],
          description:
            'Italicise the selected text, or insert `_…_` at the cursor if nothing is selected.',
          example: 'Type: This feels subtle /i',
          icon: null,
        },
      ],
    },
    {
      title: 'Headings & structure',
      items: [
        {
          cmd: '/h1',
          aliases: [],
          description: 'Turn the current line into a level-1 heading (`# Heading`).',
          example: 'Type: Dark UI design /h1',
          icon: null,
        },
        {
          cmd: '/h2',
          aliases: [],
          description: 'Turn the current line into a level-2 heading (`## Heading`).',
          example: 'Type: Details /h2',
          icon: null,
        },
        {
          cmd: '/quote',
          aliases: [],
          description: 'Turn the current line into a quote (`> text`).',
          example: 'Type: This is a quote /quote',
          icon: null,
        },
        {
          cmd: '/list',
          aliases: [],
          description: 'Turn the current line into a bullet item (`- item`).',
          example: 'Type: First point /list',
          icon: null,
        },
      ],
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end"
        onPress={onClose}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            className="bg-fomio-bg dark:bg-fomio-bg-dark rounded-t-3xl"
            style={{
              maxHeight: maxSheetHeight,
              height: maxSheetHeight,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-fomio-border-soft dark:border-fomio-border-soft-dark">
              <Text className="text-title font-semibold text-fomio-foreground dark:text-fomio-foreground-dark">
                Slash Commands
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="p-2"
                accessible
                accessibilityRole="button"
                accessibilityLabel="Close slash commands help"
              >
                <X
                  size={20}
                  color={isDark ? '#A1A1AA' : '#6B6B72'}
                  weight="regular"
                />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ 
                paddingHorizontal: 16, 
                paddingVertical: 12,
                paddingBottom: insets.bottom + 12,
              }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Intro */}
              <View className="mb-4">
                <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark">
                  Type a slash command at the <Text className="font-semibold">end of a line</Text>{' '}
                  in <Text className="font-semibold">Write</Text> mode to format text or insert
                  content. The command will disappear and the formatting will be applied.
                </Text>
                <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark mt-2">
                  Examples:{' '}
                  <Text className="font-mono">
                    This is important /b
                  </Text>{' '}
                  or{' '}
                  <Text className="font-mono">
                    Dark UI Design /h1
                  </Text>
                  .
                </Text>
              </View>

              {sections.map((section) => (
                <View key={section.title} className="mb-4">
                  <Text className={sectionTitleClass}>{section.title}</Text>
                  {section.items.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <View
                        key={`${item.cmd}-${index}`}
                        className={commandRowClass}
                      >
                        {Icon && (
                          <Icon
                            size={18}
                            color={isDark ? '#A1A1AA' : '#6B6B72'}
                            weight="regular"
                            style={{ marginRight: 12, marginTop: 2 }}
                          />
                        )}
                        <View className="flex-1">
                          <View className="flex-row flex-wrap items-center gap-x-2">
                            <Text className={commandTextClass}>{item.cmd}</Text>
                            {item.aliases.length > 0 && (
                              <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
                                (also: {item.aliases.join(', ')})
                              </Text>
                            )}
                          </View>
                          <Text className={descriptionClass}>
                            {item.description}
                          </Text>
                          {item.example && (
                            <>
                              <Text className={exampleLabelClass}>Example</Text>
                              <Text className={exampleValueClass}>
                                {item.example}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}

              <View className="mt-4 mb-2">
                <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
                  You can use commands multiple times in the same Byte. All formatting works
                  seamlessly with the <Text className="font-semibold">Write / Preview</Text> toggle.
                </Text>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

