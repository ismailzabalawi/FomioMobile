import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Pressable,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { useScreenBackBehavior } from '@/shared/hooks/useScreenBackBehavior';
import { useSafeNavigation } from '@/shared/hooks/useSafeNavigation';
import { useHeader } from '@/components/ui/header';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AuthGate } from '../../components/shared/auth-gate';
import { AuthPromptView } from '../../components/shared/auth-prompt-view';
import { useDiscourseUser } from '../../shared/useDiscourseUser';
import { useAuth } from '@/shared/auth-context';
import { Avatar } from '../../components/ui/avatar';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Camera, X, Check, NotePencil } from 'phosphor-react-native';
import { EditProfileSkeleton } from '@/components/profile/EditProfileSkeleton';
import { discourseApi } from '../../shared/discourseApi';
import { useToast, validationRules, formValidationManager } from '@/shared/form-validation';
import { getTokens } from '@/shared/design/tokens';

export default function EditProfileScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { safeBack } = useSafeNavigation();
  const { user: authUser } = useAuth();
  const { user, settings, loading, updating, error, updateProfile, uploadAvatar, uploadProfileHeader, refreshUser } = useDiscourseUser(authUser?.username);
  const { showSuccess, showError, showInfo } = useToast();
  const { setHeader, resetHeader, setActions } = useHeader();
  
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio_raw || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [allowBack, setAllowBack] = useState(false);
  const [originalValues, setOriginalValues] = useState({
    displayName: '',
    bio: '',
    location: '',
    website: '',
  });

  // Refs for form field navigation
  const displayNameRef = React.useRef<any>(null);
  const bioRef = React.useRef<any>(null);
  const locationRef = React.useRef<any>(null);
  const websiteRef = React.useRef<any>(null);

  // Form validation setup
  const fieldRules = React.useMemo(() => ({
    displayName: [
      validationRules.required('Display name is required'),
      validationRules.minLength(2, 'Display name must be at least 2 characters'),
    ],
    bio: [
      validationRules.maxLength(500, 'Bio cannot exceed 500 characters'),
    ],
    location: [
      validationRules.maxLength(120, 'Location cannot exceed 120 characters'),
    ],
    website: [
      validationRules.pattern(
        /^(https?:\/\/[^\s.]+\.[^\s]{2,}(\/.*)?|)$/i,
        'Please enter a valid URL (e.g., https://example.com)'
      ),
    ],
  }), []);

  // Track touched/blurred fields for validation display
  const [touchedFields, setTouchedFields] = React.useState<Set<string>>(new Set());
  const [blurredFields, setBlurredFields] = React.useState<Set<string>>(new Set());

  // Validate form using validation manager directly
  const [validation, setValidation] = React.useState<{
    isValid: boolean;
    fields: Record<string, any>;
  }>({ isValid: true, fields: {} });

  React.useEffect(() => {
    const validateForm = async () => {
      const formData = { displayName, bio, website };
      const result = await formValidationManager.validateForm(formData, fieldRules);
      
      // Update touched and blurred states
      Object.keys(result.fields).forEach(fieldName => {
        result.fields[fieldName].hasBeenTouched = touchedFields.has(fieldName);
        result.fields[fieldName].hasBeenBlurred = blurredFields.has(fieldName);
      });
      
      setValidation(result);
    };
    
    validateForm();
  }, [displayName, bio, website, touchedFields, blurredFields, fieldRules]);

  const isValid = validation.isValid;
  const getFieldValidation = React.useCallback((fieldName: string) => {
    return validation.fields[fieldName] || {
      isValid: true,
      errors: [],
      warnings: [],
      infos: [],
      isValidating: false,
      hasBeenTouched: false,
      hasBeenBlurred: false,
    };
  }, [validation.fields]);

  const blurField = React.useCallback((fieldName: string) => {
    setBlurredFields(prev => new Set(prev).add(fieldName));
  }, []);

  const handleHeroEditPress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    displayNameRef.current?.focus();
  }, []);

  // Compute current avatar URL from user data or local state
  const currentAvatarUrl = avatarUrl || (user?.avatar_template ? discourseApi.getAvatarUrl(user.avatar_template, 120) : null);
  const currentCoverUrl = coverUrl || (user as any)?.profile_background || null;
  const mode = isDark ? 'dark' : 'light';
  const tokens = React.useMemo(() => getTokens(mode), [mode]);
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#0b1018' : '#ffffff'),
    card: isAmoled ? '#0c0f17' : (isDark ? '#111827' : '#f8fafc'),
    text: tokens.colors.text,
    secondary: tokens.colors.muted,
    border: tokens.colors.border,
    accent: tokens.colors.accent,
    error: isDark ? '#ef4444' : '#dc2626',
  };
  const bioMaxLength = 500;
  const bioRemaining = Math.max(0, bioMaxLength - bio.length);
  const bioCounterColor =
    bioRemaining <= 10 ? colors.error : bioRemaining <= 50 ? colors.accent : colors.secondary;

  // Update local state when user data loads
  React.useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setBio(user.bio_raw || '');
      setLocation(user.location || '');
      setWebsite(user.website || '');
      setAvatarUrl(user.avatar_template ? discourseApi.getAvatarUrl(user.avatar_template, 120) : null);
      setCoverUrl((user as any)?.profile_background || null);
      setOriginalValues({
        displayName: user.name || '',
        bio: user.bio_raw || '',
        location: user.location || '',
        website: user.website || '',
      });
      setHasChanges(false);
    }
  }, [user]);

  // Track dirty state based on diffs vs original values
  React.useEffect(() => {
    const nextHasChanges =
      displayName !== originalValues.displayName ||
      bio !== originalValues.bio ||
      location !== originalValues.location ||
      website !== originalValues.website;
    setHasChanges(nextHasChanges);
  }, [displayName, bio, location, website, originalValues]);

  React.useEffect(() => {
    if (!hasChanges) {
      setAllowBack(false);
    }
  }, [hasChanges]);

  const handleAvatarUpload = useCallback(async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showError(
            'Permission Required',
            'We need access to your photos to upload an avatar.'
          );
          return;
        }
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setUploadingAvatar(true);
        setAvatarUrl(asset.uri);

        // Upload avatar - use object format compatible with uploadAvatar signature
        const imageFile = {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || 'avatar.jpg',
          fileSize: asset.fileSize,
        } as { uri: string; type?: string; name?: string; fileSize?: number };
        const success = await uploadAvatar(imageFile);

        if (success) {
          showSuccess('Avatar updated', 'Your profile picture has been updated successfully.');
          await refreshUser();
        } else {
          // Get error message from useDiscourseUser hook
          const errorMessage = error || 'Failed to upload avatar. Please try again.';
          showError('Upload failed', errorMessage, {
            label: 'Retry',
            onPress: handleAvatarUpload,
          });
          // Revert to original avatar
          if (user?.avatar_template) {
            setAvatarUrl(discourseApi.getAvatarUrl(user.avatar_template, 120));
          } else {
            setAvatarUrl(null);
          }
        }
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      showError('Upload failed', 'An error occurred while uploading the avatar.', {
        label: 'Retry',
        onPress: handleAvatarUpload,
      });
      // Revert to original avatar
      if (user?.avatar_template) {
        setAvatarUrl(discourseApi.getAvatarUrl(user.avatar_template, 120));
      } else {
        setAvatarUrl(null);
      }
    } finally {
      setUploadingAvatar(false);
    }
  }, [uploadAvatar, refreshUser, user, showSuccess, showError]);

  const handleCoverUpload = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showError(
            'Permission Required',
            'We need access to your photos to update your cover image.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setUploadingCover(true);
        setCoverUrl(asset.uri);

        const imageFile = {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || 'profile-header.jpg',
          fileSize: asset.fileSize,
        } as { uri: string; type?: string; name?: string; fileSize?: number };

        const success = await uploadProfileHeader(imageFile);

        if (success) {
          showSuccess('Cover updated', 'Your profile header has been updated.');
          await refreshUser();
        } else {
          const errorMessage = error || 'Failed to update cover. Please try again.';
          showError('Upload failed', errorMessage, {
            label: 'Retry',
            onPress: handleCoverUpload,
          });
          setCoverUrl((user as any)?.profile_background || null);
        }
      }
    } catch (err) {
      console.error('Cover upload error:', err);
      showError('Upload failed', 'An error occurred while uploading the cover.', {
        label: 'Retry',
        onPress: handleCoverUpload,
      });
      setCoverUrl((user as any)?.profile_background || null);
    } finally {
      setUploadingCover(false);
    }
  }, [uploadProfileHeader, refreshUser, user, showSuccess, showError, error]);

  const handleSave = useCallback(async () => {
    // Mark all fields as touched/blurred to show validation errors
    setTouchedFields(new Set(['displayName', 'bio', 'website']));
    setBlurredFields(new Set(['displayName', 'bio', 'website']));

    // Validate user data is available with more detailed checks
    if (!user) {
      console.error('❌ Cannot save: user object is null', {
        hasUser: false,
        hasAuthUser: !!authUser,
        authUsername: authUser?.username,
        loading,
        error,
        timestamp: new Date().toISOString(),
      });
      showError(
        'Error', 
        'User data not available. Please refresh and try again.',
        {
          label: 'Refresh',
          onPress: () => refreshUser(),
        }
      );
      return;
    }

    // Check if username exists - it's required for API calls
    if (!user.username || user.username.trim() === '') {
      console.error('❌ Cannot save: user.username is missing or empty', {
        hasUser: !!user,
        userKeys: Object.keys(user || {}),
        username: user?.username,
        usernameType: typeof user?.username,
        usernameValue: JSON.stringify(user?.username),
        authUsername: authUser?.username,
        loading,
        error,
        timestamp: new Date().toISOString(),
      });
      showError(
        'Error', 
        'User username is missing. Please refresh and try again.',
        {
          label: 'Refresh',
          onPress: () => refreshUser(),
        }
      );
      return;
    }

    try {
      const updates: any = {};
      
      if (displayName !== (user.name || '')) {
        updates.name = displayName;
      }
      if (bio !== (user.bio_raw || '')) {
        updates.bio_raw = bio;
      }
      if (location !== (user.location || '')) {
        updates.location = location;
      }
      if (website !== (user.website || '')) {
        updates.website = website;
      }

      if (Object.keys(updates).length === 0) {
        showInfo('No Changes', 'You haven\'t made any changes to save.');
        return;
      }

      console.log('📤 Attempting profile update:', {
        username: user.username,
        updates: Object.keys(updates),
        updateValues: updates,
        timestamp: new Date().toISOString(),
      });

      const success = await updateProfile(updates);
      
      if (success) {
        console.log('✅ Profile updated successfully:', {
          username: user.username,
          updates: Object.keys(updates),
          timestamp: new Date().toISOString(),
        });
        showSuccess('Profile updated', 'Your changes have been saved.');
        setOriginalValues({
          displayName,
          bio,
          location,
          website,
        });
        setHasChanges(false);
        safeBack();
      } else {
        const errorMessage = error || 'Failed to update profile. Please try again.';
        console.error('❌ Profile update failed:', {
          error: errorMessage,
          username: user.username,
          updates: Object.keys(updates),
          timestamp: new Date().toISOString(),
        });
        showError('Update failed', errorMessage);
      }
    } catch (err) {
      const errorDetails = {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        username: user?.username,
        timestamp: new Date().toISOString(),
        context: 'profile_update',
      };
      console.error('❌ Profile update exception:', errorDetails);
      showError('Error', 'An error occurred while updating your profile.');
    }
  }, [user, displayName, bio, location, website, updateProfile, error, loading, authUser, refreshUser, safeBack, showSuccess, showError, showInfo]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive', 
            onPress: () => {
              setAllowBack(true);
              requestAnimationFrame(() => safeBack());
            },
          }
        ]
      );
    } else {
      safeBack();
    }
  }, [hasChanges, safeBack]);

  // Header action buttons - MUST be memoized to prevent infinite loops
  const cancelButton = React.useMemo(() => (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        handleCancel();
      }}
      hitSlop={12}
      className="p-2 rounded-full"
      accessible
      accessibilityRole="button"
      accessibilityLabel="Cancel editing"
    >
      <X size={24} color={colors.text} weight="regular" />
    </TouchableOpacity>
  ), [handleCancel, colors.text]);

  const saveButton = React.useMemo(() => (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        handleSave();
      }}
      disabled={!hasChanges || !isValid || updating}
      hitSlop={12}
      className="p-2 rounded-full"
      style={{ opacity: (!hasChanges || !isValid || updating) ? 0.5 : 1 }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={updating ? 'Saving changes' : 'Save changes'}
      accessibilityState={{ disabled: !hasChanges || !isValid || updating }}
    >
      {updating ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Check size={24} color={colors.accent} weight="bold" />
      )}
    </TouchableOpacity>
  ), [handleSave, hasChanges, isValid, updating, colors.accent, colors.text]);

  // Configure header with actions
  useFocusEffect(
    React.useCallback(() => {
      setHeader({
    title: "Customize Profile",
    canGoBack: true,
    withSafeTop: false,
    tone: "bg",
    compact: true,
    titleFontSize: 20,
    extendToStatusBar: true,
      });
      setActions([saveButton, cancelButton]);
      return () => {
        resetHeader();
      };
    }, [setHeader, resetHeader, setActions, saveButton, cancelButton, isDark])
  );

  useScreenBackBehavior({
    onBackPress: hasChanges && !allowBack ? handleCancel : undefined,
  }, [hasChanges, allowBack, handleCancel]);

  if (loading) {
    return (
      <ScreenContainer variant="bg">
        <ScrollView 
          style={[styles.scrollView, { backgroundColor: colors.background }]}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
        >
          <EditProfileSkeleton />
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Only show error if loading is complete and user is still null
  // This prevents false error logs during initial load
  // Only show error if we have an authenticated user but failed to load their data
  // Also check that we've actually attempted to load (not just initial mount)
  if (!loading && !user && authUser && error) {
    // Only log as warning, not error, since this might be transient
    console.warn('⚠️ Edit profile: User data not available', {
      authUsername: authUser?.username,
      timestamp: new Date().toISOString(),
      context: 'edit_profile_screen',
      loadingState: loading,
      hasAuthUser: !!authUser,
      error: error,
    });
    return (
      <ScreenContainer variant="bg">
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>Failed to load profile</Text>
          {error ? (
            <Text style={[styles.errorText, { color: colors.secondary, marginTop: 8, fontSize: 14 }]}>
              {error}
            </Text>
          ) : (
            <Text style={[styles.errorText, { color: colors.secondary, marginTop: 8, fontSize: 14 }]}>
              Unable to load your profile data. Please check your connection and try again.
            </Text>
          )}
          <Button
            variant="default"
            onPress={async () => {
              console.log('🔄 Retrying user data load...');
              await refreshUser();
            }}
            style={{ marginTop: 16 }}
          >
            Retry
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer variant="bg">
      <AuthGate
        fallback={
          <AuthPromptView
            title="Sign in to edit your profile"
            subtitle="Log in to update your profile information and preferences"
          />
        }
      >
        <KeyboardAvoidingView
          style={[styles.keyboardAvoidingView, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            style={[styles.scrollView, { backgroundColor: colors.background }]}
            contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Live Preview */}
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: isDark ? colors.card : 'rgba(255,255,255,0.7)',
                borderColor: isDark ? colors.border : 'rgba(15,23,42,0.08)',
              },
            ]}
          >
            <View style={styles.previewRow}>
              <Avatar
                source={
                  currentAvatarUrl 
                    ? { uri: currentAvatarUrl } 
                    : user?.avatar_template 
                      ? { uri: discourseApi.getAvatarUrl(user.avatar_template, 120) }
                      : undefined
                }
                fallback={(displayName || user?.username || authUser?.username || 'U').charAt(0).toUpperCase()}
                size="md"
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.previewName, { color: colors.text }]} numberOfLines={1}>
                  {displayName || user?.name || user?.username || 'Your Name'}
                </Text>
                <Text style={[styles.previewHandle, { color: colors.secondary }]} numberOfLines={1}>
                  @{user?.username || authUser?.username || 'username'}
                </Text>
              </View>
              <View style={[styles.previewBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.previewBadgeText}>Preview</Text>
              </View>
            </View>
            <Text
              style={[styles.previewBio, { color: colors.secondary }]}
              numberOfLines={2}
            >
              {bio?.trim().length ? bio.trim() : 'Your bio will appear here.'}
            </Text>
          </View>
          {/* Images Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Images</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
              Update your avatar and header
            </Text>
          </View>
          {/* Cover Section */}
          <View style={[styles.coverSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              style={styles.coverImageWrapper}
              disabled
              accessibilityRole="button"
              accessibilityLabel="Profile header image (coming soon)"
              accessibilityHint="Header image uploads are coming soon"
            >
              {currentCoverUrl ? (
                <Image
                  source={{ uri: currentCoverUrl }}
                  style={styles.coverImage}
                  contentFit="cover"
                  transition={200}
                  accessible
                  accessibilityLabel="Profile cover image"
                />
              ) : (
                <View style={[styles.coverPlaceholder, { backgroundColor: '#0e1622' }]}>
                  <NotePencil size={28} color={colors.secondary} weight="bold" />
                  <Text style={[styles.coverPlaceholderText, { color: colors.secondary }]}>
                    Add a header image
                  </Text>
                </View>
              )}
              <View style={styles.coverComingSoonPill}>
                <Text style={styles.coverComingSoonText}>Coming soon</Text>
              </View>
              <View style={styles.coverHintPill}>
                <Text style={styles.coverHintText}>Tap to change</Text>
              </View>
              {uploadingCover && (
                <View style={styles.coverUploadingOverlay}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.coverUploadingText}>Uploading...</Text>
                </View>
              )}
              <TouchableOpacity 
                style={[styles.coverButton, { backgroundColor: colors.accent }, styles.coverButtonDisabled]}
                onPress={undefined}
                disabled={true}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Change profile header (coming soon)"
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Change cover</Text>
              </TouchableOpacity>
            </Pressable>
          </View>

          {/* Avatar Section */}
          <View style={[styles.avatarSection, { backgroundColor: colors.card }]}>
            <Pressable
              style={styles.avatarContainer}
              onPress={handleAvatarUpload}
              disabled={uploadingAvatar}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              accessibilityHint="Opens your photo library"
            >
              <Avatar
                source={
                  currentAvatarUrl 
                    ? { uri: currentAvatarUrl } 
                    : user?.avatar_template 
                      ? { uri: discourseApi.getAvatarUrl(user.avatar_template, 120) }
                      : undefined
                }
                fallback={(user?.username || user?.name || authUser?.username || 'U').charAt(0).toUpperCase()}
                size="xl"
              />
              {uploadingAvatar && (
                <View style={styles.avatarUploadingOverlay}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              )}
              <TouchableOpacity 
                style={[styles.avatarButton, { backgroundColor: colors.accent }]}
                onPress={handleAvatarUpload}
                disabled={uploadingAvatar}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Change profile picture"
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Camera size={20} color="white" weight="fill" />
                )}
              </TouchableOpacity>
            </Pressable>
            <Text style={[styles.avatarText, { color: colors.secondary }]}>
              Tap to change your profile picture
            </Text>
          </View>

          {/* Identity Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Identity</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
              How you appear to others
            </Text>
          </View>
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            {/* Username (Read-only) */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Username</Text>
              <Input
                value={user?.username || authUser?.username || ''}
                disabled={true}
                style={{ ...styles.input, opacity: 0.6 }}
              />
              <Text style={[styles.fieldHint, { color: colors.secondary }]}>
                Username cannot be changed
              </Text>
            </View>

            {/* Display Name */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Display Name</Text>
              <Input
                ref={displayNameRef}
                value={displayName}
                onChangeText={(text) => {
                  setDisplayName(text);
                  setHasChanges(true);
                  setTouchedFields(prev => new Set(prev).add('displayName'));
                }}
                onBlur={() => blurField('displayName')}
                onSubmitEditing={() => bioRef.current?.focus()}
                returnKeyType="next"
                placeholder="Enter your display name"
                style={styles.input}
                accessibilityLabel="Display name"
                accessibilityHint="Enter your display name. Must be at least 2 characters."
                accessibilityLiveRegion="polite"
              />
              <View style={styles.fieldFooter}>
                {(() => {
                  const fieldValidation = getFieldValidation('displayName');
                  if (fieldValidation.hasBeenBlurred && !fieldValidation.isValid && fieldValidation.errors.length > 0) {
                    return (
                      <Text 
                        style={[styles.fieldError, { color: colors.error }]}
                        accessibilityRole="alert"
                        accessibilityLiveRegion="assertive"
                      >
                        {fieldValidation.errors[0].message}
                      </Text>
                    );
                  }
                  return null;
                })()}
              </View>
            </View>

            {/* Bio */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Bio</Text>
              <Input
                ref={bioRef}
                value={bio}
                onChangeText={(text) => {
                  // Enforce 500 character limit
                  const limitedText = text.length > bioMaxLength ? text.substring(0, bioMaxLength) : text;
                  setBio(limitedText);
                  setHasChanges(true);
                  setTouchedFields(prev => new Set(prev).add('bio'));
                }}
                onBlur={() => blurField('bio')}
                onSubmitEditing={() => locationRef.current?.focus()}
                returnKeyType="next"
                placeholder="Tell us about yourself"
                multiline
                numberOfLines={4}
                maxLength={bioMaxLength}
                style={StyleSheet.flatten([styles.input, styles.textArea])}
                accessibilityLabel="Bio"
                accessibilityHint={`Enter your bio. Current length: ${bio.length} of ${bioMaxLength} characters maximum.`}
                accessibilityLiveRegion="polite"
              />
              <View style={styles.fieldFooterRow}>
                <Text style={[styles.fieldHint, { color: bioCounterColor }]}>
                  {bioRemaining} characters left
                </Text>
              </View>
              {(() => {
                const fieldValidation = getFieldValidation('bio');
                if (fieldValidation.hasBeenBlurred && !fieldValidation.isValid && fieldValidation.errors.length > 0) {
                  return (
                    <Text 
                      style={[styles.fieldError, { color: colors.error, marginTop: 4 }]}
                      accessibilityRole="alert"
                      accessibilityLiveRegion="assertive"
                    >
                      {fieldValidation.errors[0].message}
                    </Text>
                  );
                }
                return null;
              })()}
            </View>
          </View>

          {/* Details Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
              Optional profile metadata
            </Text>
          </View>
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            {/* Location */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Location</Text>
              <Input
                ref={locationRef}
                value={location}
                onChangeText={(text) => {
                  setLocation(text);
                  setHasChanges(true);
                  setTouchedFields(prev => new Set(prev).add('location'));
                }}
                onBlur={() => blurField('location')}
                onSubmitEditing={() => websiteRef.current?.focus()}
                returnKeyType="next"
                placeholder="Your location"
                style={styles.input}
                accessibilityLabel="Location"
                accessibilityHint="Enter your location"
              />
              <View style={styles.fieldFooter}>
                {(() => {
                  const fieldValidation = getFieldValidation('location');
                  if (fieldValidation.hasBeenBlurred && !fieldValidation.isValid && fieldValidation.errors.length > 0) {
                    return (
                      <Text 
                        style={[styles.fieldError, { color: colors.error }]}
                        accessibilityRole="alert"
                        accessibilityLiveRegion="assertive"
                      >
                        {fieldValidation.errors[0].message}
                      </Text>
                    );
                  }
                  return null;
                })()}
              </View>
            </View>

            {/* Website */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Website</Text>
              <Input
                ref={websiteRef}
                value={website}
                onChangeText={(text) => {
                  setWebsite(text);
                  setHasChanges(true);
                  setTouchedFields(prev => new Set(prev).add('website'));
                }}
                onBlur={() => blurField('website')}
                onSubmitEditing={() => {
                  // Dismiss keyboard on last field
                  websiteRef.current?.blur();
                }}
                returnKeyType="done"
                placeholder="https://yourwebsite.com"
                keyboardType="url"
                autoCapitalize="none"
                style={styles.input}
                accessibilityLabel="Website"
                accessibilityHint="Enter your website URL. Must start with http:// or https://"
              />
              <View style={styles.fieldFooter}>
                {(() => {
                  const fieldValidation = getFieldValidation('website');
                  if (fieldValidation.hasBeenBlurred && !fieldValidation.isValid && fieldValidation.errors.length > 0) {
                    return (
                      <Text 
                        style={[styles.fieldError, { color: colors.error }]}
                        accessibilityRole="alert"
                        accessibilityLiveRegion="assertive"
                      >
                        {fieldValidation.errors[0].message}
                      </Text>
                    );
                  }
                  return null;
                })()}
              </View>
            </View>
          </View>

        </ScrollView>
        </KeyboardAvoidingView>
      </AuthGate>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  previewCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    marginBottom: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewHandle: {
    fontSize: 13,
  },
  previewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  previewBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  previewBio: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  coverSection: {
    padding: 0,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  coverImageWrapper: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  coverButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  coverButtonDisabled: {
    opacity: 0.6,
  },
  coverHintPill: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  coverHintText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  coverComingSoonPill: {
    position: 'absolute',
    left: 12,
    top: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  coverComingSoonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
  },
  coverUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverUploadingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarSection: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    textAlign: 'center',
  },
  formSection: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  fieldFooter: {
    minHeight: 16,
    marginTop: 4,
  },
  fieldFooterRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  fieldHint: {
    fontSize: 12,
  },
  fieldError: {
    fontSize: 12,
  },
  input: {
    width: '100%',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
