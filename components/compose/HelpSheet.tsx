// UI Spec: HelpSheet
// - Modal cheat sheet for slash commands
// - Uses React Native Modal (similar to TeretPickerSheet)
// - Shows available slash commands and their descriptions
// - Clean, simple layout using NativeWind tokens

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
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

  const commands = [
    {
      command: '/help',
      description: 'Show this help sheet',
      icon: null,
    },
    {
      command: '/image',
      description: 'Insert image from your device',
      icon: ImageSquare,
    },
  ];

  // Debug logging
  useEffect(() => {
    console.log('🔍 [HelpSheet] Render state:', {
      visible,
      commandsCount: commands.length,
      isDark,
      insetsBottom: insets.bottom,
    });
  }, [visible, isDark, insets.bottom]);

  useEffect(() => {
    if (visible) {
      console.log('🔍 [HelpSheet] Modal opened', {
        commands: commands.map(c => c.command),
        commandsLength: commands.length,
      });
    }
  }, [visible]);

  console.log('🔍 [HelpSheet] Rendering with visible:', visible, 'commands:', commands.length);

  if (!visible) {
    console.log('🔍 [HelpSheet] Modal not visible, returning null');
    return null;
  }

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
              maxHeight: '90%',
              paddingBottom: insets.bottom,
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
                accessibilityLabel="Close help sheet"
              >
                <X size={20} color={isDark ? '#A1A1AA' : '#6B6B72'} weight="regular" />
              </TouchableOpacity>
            </View>

            {/* Commands List - Simple submenu structure */}
            <View style={{ padding: 16 }}>
              <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark mb-4">
                Type a slash command at the start of a line to insert content.
              </Text>

              {commands.map((cmd, index) => {
                console.log('🔍 [HelpSheet] Rendering command:', cmd.command, 'index:', index);
                const IconComponent = cmd.icon;
                return (
                  <View
                    key={cmd.command}
                    className={`py-3 ${index < commands.length - 1 ? 'border-b border-fomio-border-soft dark:border-fomio-border-soft-dark' : ''}`}
                    onLayout={(event) => {
                      console.log('🔍 [HelpSheet] Command item layout:', {
                        command: cmd.command,
                        height: event.nativeEvent.layout.height,
                      });
                    }}
                  >
                    <View className="flex-row items-start">
                      {IconComponent && (
                        <IconComponent
                          size={18}
                          color={isDark ? '#A1A1AA' : '#6B6B72'}
                          weight="regular"
                          style={{ marginRight: 12, marginTop: 2 }}
                        />
                      )}
                      <View className="flex-1">
                        <Text className="text-body font-semibold text-fomio-foreground dark:text-fomio-foreground-dark mb-1">
                          {cmd.command}
                        </Text>
                        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
                          {cmd.description}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

