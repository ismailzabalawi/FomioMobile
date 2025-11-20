import 'react-native-reanimated';
import React, { useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Pressable, Alert } from 'react-native';
import { ThemedBottomSheet, BottomSheetModalRef } from '@/components/ui';
import { DotsThreeVertical, Bell, BellSlash, Pin, Lock, Archive, Flag, Link, Share as ShareIcon } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';
import { TopicData } from '../../shared/useTopic';
import { discourseApi } from '../../shared/discourseApi';
import * as Haptics from 'expo-haptics';
import { Clipboard, Linking, Share } from 'react-native';

const notificationLabels: Record<number, string> = {
  0: 'Muted',
  1: 'Normal',
  2: 'Tracking',
  3: 'Watching',
  4: 'Watching First Post',
};

export interface OverflowMenuProps {
  topic: TopicData | null;
  onWatch?: () => void;
  onMute?: () => void;
  onPin?: () => void;
  onClose?: () => void;
  onArchive?: () => void;
  onFlag?: () => void;
  onShare?: () => void;
  onRefresh?: () => void; // Callback to refresh topic data after changes
}

// UI Spec: OverflowMenu — Bottom sheet menu for topic actions
// - Watch/Mute options (based on notificationLevel)
// - Pin/Unpin (if canPin)
// - Close/Open (if canClose)
// - Archive (if canArchive)
// - Flag (if canFlag)
// - Copy link
// - Share
// - Uses @gorhom/bottom-sheet
// - Themed with Fomio semantic tokens
export function OverflowMenu({
  topic,
  onWatch,
  onMute,
  onPin,
  onClose,
  onArchive,
  onFlag,
  onShare,
  onRefresh,
}: OverflowMenuProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const bottomSheetRef = useRef<BottomSheetModalRef>(null);
  const snapPoints = useMemo(() => ['50%'], []);

  const handleOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    bottomSheetRef.current?.present();
  }, []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const handleWatch = useCallback(async () => {
    if (!topic) return;
    try {
      await discourseApi.setNotificationLevel(topic.id, 3); // Watching
      handleClose();
      onWatch?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert('Error', 'Failed to set notification level');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [topic, handleClose, onWatch]);

  const handleToggleNotification = useCallback(async () => {
    if (!topic) return;
    const newLevel = topic.notificationLevel === 0 ? 1 : 0; // Toggle between Muted and Normal
    try {
      const response = await discourseApi.setNotificationLevel(topic.id, newLevel);
      if (response.success) {
        handleClose();
        onMute?.();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        // Refresh topic data to reflect the change
        onRefresh?.();
      } else {
        throw new Error(response.error || 'Failed to update notification level');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification level');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [topic, handleClose, onMute, onRefresh]);

  const handlePin = useCallback(async () => {
    if (!topic) return;
    try {
      if (topic.isPinned) {
        await discourseApi.unpinTopic(topic.id);
      } else {
        await discourseApi.pinTopic(topic.id);
      }
      handleClose();
      onPin?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle pin status');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [topic, handleClose, onPin]);

  const handleCloseTopic = useCallback(async () => {
    if (!topic) return;
    try {
      if (topic.isClosed) {
        await discourseApi.openTopic(topic.id);
      } else {
        await discourseApi.closeTopic(topic.id);
      }
      handleClose();
      onClose?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle topic status');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [topic, handleClose, onClose]);

  const handleCopyLink = useCallback(async () => {
    if (!topic) return;
    try {
      Clipboard.setString(topic.url);
      handleClose();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Success', 'Link copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  }, [topic, handleClose]);

  const handleShare = useCallback(async () => {
    if (!topic) return;
    try {
      await Share.share({
        message: topic.title,
        url: topic.url,
      });
      handleClose();
      onShare?.();
    } catch (error) {
      // User cancelled or error occurred
      if ((error as any)?.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share');
      }
    }
  }, [topic, handleClose, onShare]);

  const notificationLevel = topic?.notificationLevel ?? 1;
  const isWatching = notificationLevel === 3 || notificationLevel === 4;
  const isMuted = notificationLevel === 0;

  return (
    <>
      <Pressable
        onPress={handleOpen}
        hitSlop={8}
        className="p-2 rounded-full active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="More options"
      >
        <DotsThreeVertical size={20} color={colors.foreground} weight="bold" />
      </Pressable>

      <ThemedBottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
      >
        <View className="px-4 pb-6">
          <Text className="text-lg font-bold mb-4 text-fomio-foreground dark:text-fomio-foreground-dark">
            Topic Options
          </Text>

          {/* Notification options */}
          <View className="mb-4">
            <TouchableOpacity
              onPress={handleToggleNotification}
              className="flex-row items-center py-3 px-2 rounded-lg active:opacity-70"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}
            >
              {topic?.notificationLevel === 0 ? (
                <BellSlash size={20} color={colors.foreground} weight="regular" />
              ) : (
                <Bell size={20} color={colors.foreground} weight="regular" />
              )}
              <Text className="ml-3 text-base font-medium text-fomio-foreground dark:text-fomio-foreground-dark">
                {notificationLabels[topic?.notificationLevel || 1]} notifications
              </Text>
            </TouchableOpacity>
          </View>

          {/* Moderation options */}
          {topic?.canPin && (
            <TouchableOpacity
              onPress={handlePin}
              className="flex-row items-center py-3 px-2 rounded-lg active:opacity-70 mb-2"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}
            >
              <Pin size={20} color={colors.foreground} weight="regular" />
              <Text className="ml-3 text-base font-medium text-fomio-foreground dark:text-fomio-foreground-dark">
                {topic.isPinned ? 'Unpin' : 'Pin'}
              </Text>
            </TouchableOpacity>
          )}

          {topic?.canClose && (
            <TouchableOpacity
              onPress={handleCloseTopic}
              className="flex-row items-center py-3 px-2 rounded-lg active:opacity-70 mb-2"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}
            >
              <Lock size={20} color={colors.foreground} weight="regular" />
              <Text className="ml-3 text-base font-medium text-fomio-foreground dark:text-fomio-foreground-dark">
                {topic.isClosed ? 'Open' : 'Close'}
              </Text>
            </TouchableOpacity>
          )}

          {topic?.canArchive && (
            <TouchableOpacity
              onPress={onArchive}
              className="flex-row items-center py-3 px-2 rounded-lg active:opacity-70 mb-2"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}
            >
              <Archive size={20} color={colors.foreground} weight="regular" />
              <Text className="ml-3 text-base font-medium text-fomio-foreground dark:text-fomio-foreground-dark">
                Archive
              </Text>
            </TouchableOpacity>
          )}

          {topic?.canFlag && (
            <TouchableOpacity
              onPress={onFlag}
              className="flex-row items-center py-3 px-2 rounded-lg active:opacity-70 mb-2"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}
            >
              <Flag size={20} color={colors.foreground} weight="regular" />
              <Text className="ml-3 text-base font-medium text-fomio-foreground dark:text-fomio-foreground-dark">
                Flag
              </Text>
            </TouchableOpacity>
          )}

          {/* Share options */}
          <View className="border-t mt-4 pt-4 border-fomio-border-soft dark:border-fomio-border-soft-dark">
            <TouchableOpacity
              onPress={handleCopyLink}
              className="flex-row items-center py-3 px-2 rounded-lg active:opacity-70 mb-2"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}
            >
              <Link size={20} color={colors.foreground} weight="regular" />
              <Text className="ml-3 text-base font-medium text-fomio-foreground dark:text-fomio-foreground-dark">
                Copy Link
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              className="flex-row items-center py-3 px-2 rounded-lg active:opacity-70"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}
            >
              <ShareIcon size={20} color={colors.foreground} weight="regular" />
              <Text className="ml-3 text-base font-medium text-fomio-foreground dark:text-fomio-foreground-dark">
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedBottomSheet>
    </>
  );
}

