// UI Spec: ComposeScreen
// - Editor-first create experience with zero friction
// - Uses NativeWind semantic tokens throughout
// - Bottom sheet for Teret selection
// - Full image picker support
// - Haptic feedback on key interactions
// - Inline validation (no Alert dialogs)
// - Smart Post button enable/disable

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme';
import { useTerets, Teret } from '../../shared/useTerets';
import { useAuth } from '../../shared/useAuth';
import { useDiscourseSettings } from '../../shared/useDiscourseSettings';
import { createTopic } from '../../lib/discourse';
import { discourseApi } from '@/shared/discourseApi';
import { SignIn, Check, Warning } from 'phosphor-react-native';
import { 
  ComposeEditor,
  MediaGrid,
  useImagePicker,
  MediaItem,
  HelpSheet,
} from '@/components/compose';
import { useHeader } from '@/components/ui/header';
import { TeretPickerSheet } from '@/components/terets/TeretPickerSheet';

interface ValidationErrors {
  title?: string;
  content?: string;
  hub?: string;
  general?: string;
}

export default function ComposeScreen(): React.ReactElement {
  const { isDark } = useTheme();
  const { setHeader, resetHeader, setActions, setProgress, setBackBehavior } = useHeader();
  const { 
    terets, 
    allCategories, // All categories (Hubs + Terets) for picker
    isLoading: teretsLoading, 
    errorMessage: teretsError, 
    refreshTerets 
  } = useTerets();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { minTitle, minPost, loading: settingsLoading } = useDiscourseSettings();
  const { pickImages, isPicking } = useImagePicker();
  
  // Editor state - structured cleanly for future draft autosave
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [selectedTeret, setSelectedTeret] = useState<Teret | null>(null);
  const [images, setImages] = useState<MediaItem[]>([]);

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isTeretSheetOpen, setIsTeretSheetOpen] = useState(false);
  const [isHelpSheetOpen, setIsHelpSheetOpen] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // Configure header - moved after handleCancel definition

  // Debug: Track isHelpSheetOpen changes
  useEffect(() => {
    console.log('🔍 [ComposeScreen] isHelpSheetOpen changed to:', isHelpSheetOpen);
  }, [isHelpSheetOpen]);

  // Clear errors when user starts typing
  useEffect(() => {
    if (title.trim() && errors.title) {
      setErrors((prev) => ({ ...prev, title: undefined }));
    }
  }, [title, errors.title]);

  useEffect(() => {
    if (body.trim() && errors.content) {
      setErrors((prev) => ({ ...prev, content: undefined }));
    }
  }, [body, errors.content]);

  useEffect(() => {
    if (selectedTeret && errors.hub) {
      setErrors((prev) => ({ ...prev, hub: undefined }));
    }
  }, [selectedTeret, errors.hub]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // DEBUG: Log Terets state for picker
  useEffect(() => {
    console.log('🔍 [ComposeScreen] Terets state for picker:', {
      teretsCount: terets.length,
      isLoading: teretsLoading,
      error: teretsError,
      teretNames: terets.slice(0, 5).map((t) => t.name),
      isTeretSheetOpen,
    });
  }, [terets, teretsLoading, teretsError, isTeretSheetOpen]);

  // Compute lengths for validation
  const titleLen = title.trim().length;
  const bodyLen = body.trim().length;

  // Smart Post button enable logic - enforces Discourse minimums
  const canPost = useMemo(() => {
    return (
      titleLen >= minTitle &&
      bodyLen >= minPost &&
      selectedTeret !== null &&
      isAuthenticated &&
      !isAuthLoading &&
      !isCreating &&
      !settingsLoading
    );
  }, [titleLen, bodyLen, minTitle, minPost, selectedTeret, isAuthenticated, isAuthLoading, isCreating, settingsLoading]);

  const handleCancel = useCallback((): void => {
    router.back();
  }, []);

  // Configure header
  useEffect(() => {
    setHeader({
      title: "Create Byte",
      withSafeTop: false,
      tone: "card",
    });
    setBackBehavior({
      canGoBack: true,
      onBackPress: handleCancel,
    });
    return () => resetHeader();
  }, [setHeader, resetHeader, setBackBehavior, handleCancel]);

  const handlePost = useCallback(async (): Promise<void> => {
    // Clear previous errors
    setErrors({});
    setSuccessMessage('');

    // Wait for auth to load
    if (isAuthLoading) {
      setErrors({ general: 'Please wait, authentication is loading...' });
      return;
    }

    // Validate authentication
    if (!isAuthenticated) {
      setErrors({ general: 'You need to be logged in to create posts' });
      return;
    }

    // Validate teret selection (first - most important)
    // Must be a Teret (subcategory), never a Hub (parent category)
    if (!selectedTeret || !selectedTeret.parent_category_id) {
      setErrors((prev) => ({ ...prev, hub: 'Please select a Teret to post in' }));
      return;
    }

    // Validate title with Discourse minimum
    const titleLen = title.trim().length;
    if (titleLen < minTitle) {
      setErrors((prev) => ({ 
        ...prev, 
        title: `Title must be at least ${minTitle} characters (currently ${titleLen})` 
      }));
      return;
    }
    
    // Validate body with Discourse minimum
    const bodyLen = body.trim().length;
    if (bodyLen < minPost) {
      setErrors((prev) => ({ 
        ...prev, 
        content: `Content must be at least ${minPost} characters (currently ${bodyLen})` 
      }));
      return;
    }

    try {
      // Haptic feedback on post
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Ignore haptic errors
      }

      setIsCreating(true);
      setErrors({});

      console.log('📝 Creating post with teret:', {
        teretId: selectedTeret.id, // This is the subcategory ID (what Discourse needs)
        teretName: selectedTeret.name,
        parentHub: selectedTeret.parent_category.name,
        parentHubId: selectedTeret.parent_category_id,
        user: user?.username,
        isAuthenticated: isAuthenticated,
        hasImages: images.length > 0,
      });

      // Images are uploaded when added (via /image command).
      // Body already contains Markdown with their URLs.
      //
      // IMPORTANT: Fomio → Discourse category mapping:
      // - Hub = Discourse parent category (used for grouping/display only)
      // - Teret = Discourse subcategory (this is what we post to!)
      // - Bytes must be created in Terets (subcategories), never directly in Hubs
      // - selectedTeret.id is the subcategory ID that Discourse requires
      const result = await createTopic({
        title: title.trim(),
        raw: body.trim(),
        categoryId: selectedTeret.id, // Subcategory ID (Teret), not parent category ID (Hub)
      });

      // Success feedback
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignore haptic errors
      }

      setSuccessMessage('Your post has been published!');

      // Clear form and navigate back after short delay
      setTimeout(() => {
        setTitle('');
        setBody('');
        setSelectedTeret(null);
        setImages([]);
        setSuccessMessage('');
        router.back();
      }, 1500);
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to create post. Please try again.';
      setErrors({ general: errorMsg });

      // Error haptic feedback
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Ignore haptic errors
      }
    } finally {
      setIsCreating(false);
    }
  }, [
    title,
    body,
    selectedTeret,
    images,
    isAuthenticated,
    isAuthLoading,
    user,
    minTitle,
    minPost,
  ]);

  const handleTeretPress = useCallback(() => {
    // Haptic feedback on press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Ignore haptic errors
    });
    setIsTeretSheetOpen(true);
  }, []);

  // Helper to insert image markdown into body
  const insertImageMarkdown = useCallback(
    (urls: string[]) => {
      if (!urls.length) return;
      
      setBody((prev) => {
        const sep = prev.trim().length === 0 ? '' : '\n\n';
        const markdown = urls
          .map((url) => `![image](${url})`)
          .join('\n\n');
        return `${prev}${sep}${markdown}\n`;
      });
    },
    []
  );

  const handleAddImages = useCallback(async () => {
    const pickedImages = await pickImages();
    if (pickedImages.length === 0) return;

    setIsUploadingImages(true);
    
    try {
      // Upload images sequentially and get URLs
      const uploadedImages: Array<{ url: string; uri: string }> = [];
      
      for (const image of pickedImages) {
        try {
          // Detect MIME type from image or default to JPEG
          const mimeType = 'image/jpeg'; // expo-image-picker doesn't provide type in result, default to JPEG
          
          const result = await discourseApi.uploadImage({
            uri: image.uri,
            type: mimeType,
            name: `image.jpg`,
          });
          
          if (result.success && result.data?.url) {
            uploadedImages.push({
              url: result.data.url,
              uri: image.uri,
            });
          } else {
            console.error('Failed to upload image:', result.error);
            // Continue with other images even if one fails
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          // Continue with other images
        }
      }

      // Update images state with uploaded URLs
      if (uploadedImages.length > 0) {
        setImages((prev) => [
          ...prev,
          ...uploadedImages.map((img) => ({
            uri: img.url, // Store uploaded URL as uri for MediaGrid
            type: 'image' as const,
          })),
        ]);

        // Insert markdown into body
        const urls = uploadedImages.map((img) => img.url).filter(Boolean);
        insertImageMarkdown(urls);

        // Haptic feedback on success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
          // Ignore haptic errors
        });
      }
    } catch (error) {
      console.error('Error in handleAddImages:', error);
      // User feedback can be added here if needed
    } finally {
      setIsUploadingImages(false);
    }
  }, [pickImages, insertImageMarkdown]);

  // Handler for /help slash command
  const handleSlashHelp = useCallback(() => {
    console.log('🔍 [ComposeScreen] handleSlashHelp called');
    setIsHelpSheetOpen(true);
  }, []);

  // Handler for /image slash command - reuses handleAddImages (Phase B: uploads and inserts markdown)
  const handleSlashImage = useCallback(() => {
    handleAddImages();
  }, [handleAddImages]);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    // Haptic feedback on removal
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Ignore haptic errors
    });
  }, []);

  // Loading state
  if (teretsLoading) {
    return (
      <ScreenContainer variant="card">
        <View className="flex-1 justify-center items-center">
          <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark">
            Loading terets...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (teretsError) {
    return (
      <ScreenContainer variant="card">
        <View className="flex-1 justify-center items-center px-4">
          <Warning size={48} color="#EF4444" weight="regular" />
          <Text className="text-title font-semibold text-fomio-danger dark:text-fomio-danger-dark mt-4 mb-2 text-center">
            Failed to load terets
          </Text>
          <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark mb-6 text-center">
            {teretsError || 'Please check your connection and try again'}
          </Text>
          <Button onPress={refreshTerets} variant="default">
            Retry
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  // Show auth prompt if not authenticated (after loading check)
  if (!isAuthLoading && !isAuthenticated) {
    return (
      <ScreenContainer variant="card">
        <View className="flex-1 justify-center items-center px-8">
          <SignIn size={64} color={isDark ? '#3b82f6' : '#0ea5e9'} weight="regular" />
          <Text className="text-title font-semibold text-fomio-primary dark:text-fomio-primary-dark mt-6 mb-2 text-center">
            Sign in to create Bytes
          </Text>
          <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark mb-8 text-center">
            You need to be logged in to create and share posts with the community.
          </Text>
          <Button
            onPress={() => router.push('/(auth)/signin' as any)}
            variant="default"
            size="lg"
          >
            Sign In
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer variant="card">

      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Authentication Warning */}
          {!isAuthLoading && !isAuthenticated && (
            <View className="mx-4 mt-4 p-4 rounded-fomio-card bg-fomio-warning/20 dark:bg-fomio-warning-dark/20 flex-row items-center">
              <SignIn size={20} color="#F59E0B" weight="regular" />
              <View className="flex-1 ml-3">
                <Text className="text-body font-semibold text-fomio-warning dark:text-fomio-warning-dark mb-1">
                  Sign in to post
            </Text>
                <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
                  You need to be logged in to create posts
            </Text>
          </View>
              <Button
                onPress={() => router.push('/(auth)/signin' as any)}
                variant="default"
                size="sm"
              >
                Sign In
              </Button>
                </View>
              )}

          {/* General Error Message */}
          {errors.general && (
            <View className="mx-4 mt-4 p-3 rounded-fomio-card bg-fomio-danger/20 dark:bg-fomio-danger-dark/20 flex-row items-center">
              <Warning size={16} color="#EF4444" weight="regular" />
              <Text className="text-body text-fomio-danger dark:text-fomio-danger-dark ml-2 flex-1">
                {errors.general}
              </Text>
            </View>
          )}

          {/* Success Message */}
          {successMessage && (
            <View className="mx-4 mt-4 p-3 rounded-fomio-card bg-fomio-accent/20 dark:bg-fomio-accent-dark/20 flex-row items-center">
              <Check size={16} color="#22C55E" weight="regular" />
              <Text className="text-body text-fomio-accent dark:text-fomio-accent-dark ml-2 flex-1">
                {successMessage}
              </Text>
            </View>
          )}

          {/* Teret Selection Error */}
          {errors.hub && (
            <View className="mx-4 mt-2 mb-2 flex-row items-center">
              <Warning size={14} color="#EF4444" weight="regular" />
              <Text className="text-caption text-fomio-danger dark:text-fomio-danger-dark ml-2">
                {errors.hub}
              </Text>
            </View>
          )}

          {/* Compose Editor - Title → Teret Row → Body */}
          <ComposeEditor
            title={title}
            body={body}
            onChangeTitle={setTitle}
            onChangeBody={setBody}
            selectedTeret={selectedTeret}
            onTeretPress={handleTeretPress}
            onSlashHelp={handleSlashHelp}
            onSlashImage={handleSlashImage}
          />

          {/* Small hint under editor */}
          <View className="px-4 mt-2">
            <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
              Pro tip:{' '}
              <Text className="font-mono">
                /help
              </Text>{' '}
              shows all slash commands.
            </Text>
          </View>

          {/* Media Grid */}
          {images.length > 0 && (
            <MediaGrid media={images} onRemove={handleRemoveImage} />
          )}

          {/* Upload feedback */}
          {isUploadingImages && (
            <View className="mx-4 mt-2 p-2 rounded-fomio-card bg-fomio-muted/20 dark:bg-fomio-muted-dark/20">
              <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark text-center">
                Uploading images...
              </Text>
            </View>
          )}

          {/* Bottom spacing */}
          <View className="h-8" />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Teret Picker Bottom Sheet */}
      <TeretPickerSheet
        visible={isTeretSheetOpen}
        selectedTeret={selectedTeret}
        allCategories={allCategories} // Pass all categories (Hubs + Terets)
        isLoading={teretsLoading}
        error={teretsError || null}
        onClose={() => setIsTeretSheetOpen(false)}
        onSelect={(teret) => {
          setSelectedTeret(teret);
          setIsTeretSheetOpen(false);
        }}
      />

      {/* Help Sheet Modal */}
      <HelpSheet
        visible={isHelpSheetOpen}
        onClose={() => setIsHelpSheetOpen(false)}
      />
    </ScreenContainer>
  );
}
