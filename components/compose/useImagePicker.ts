// UI Spec: useImagePicker
// - Hook for image picker functionality using expo-image-picker
// - Request media library permissions
// - Support multiple image selection
// - Return image URIs for MediaGrid component

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface ImagePickerResult {
  uri: string;
  type: 'image';
}

export function useImagePicker() {
  const [isPicking, setIsPicking] = useState(false);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return true;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photos to add images to your post.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  }, []);

  const pickImages = useCallback(async (): Promise<ImagePickerResult[]> => {
    try {
      setIsPicking(true);

      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        return [];
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets) {
        return [];
      }

      // Haptic feedback on successful selection
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignore haptic errors
      }

      return result.assets.map((asset) => ({
        uri: asset.uri,
        type: 'image' as const,
      }));
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
      return [];
    } finally {
      setIsPicking(false);
    }
  }, [requestPermissions]);

  return {
    pickImages,
    isPicking,
  };
}

