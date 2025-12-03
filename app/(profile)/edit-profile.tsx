import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
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
import { Camera, X, Check } from 'phosphor-react-native';
import { EditProfileSkeleton } from '@/components/profile/EditProfileSkeleton';
import { discourseApi } from '../../shared/discourseApi';
import { router } from 'expo-router';
import { useToast, validationRules, formValidationManager } from '@/shared/form-validation';
import { getThemeColors } from '@/shared/theme-constants';

export default function EditProfileScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { safeBack } = useSafeNavigation();
  const { user: authUser } = useAuth();
  const { user, settings, loading, updating, error, updateProfile, uploadAvatar, refreshUser } = useDiscourseUser(authUser?.username);
  const { showSuccess, showError, showInfo } = useToast();
  const { setHeader, resetHeader, setActions } = useHeader();
  
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio_raw || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
    website: [
      validationRules.pattern(
        /^https?:\/\/.+\..+/,
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

  // Compute current avatar URL from user data or local state
  const currentAvatarUrl = avatarUrl || (user?.avatar_template ? discourseApi.getAvatarUrl(user.avatar_template, 120) : null);
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    card: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#f8fafc'),
    text: isDark ? '#f4f4f5' : '#1e293b',
    secondary: isDark ? '#a1a1aa' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    accent: isDark ? '#38bdf8' : '#0ea5e9',
    error: isDark ? '#ef4444' : '#dc2626',
  };

  // Update local state when user data loads
  React.useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setBio(user.bio_raw || '');
      setLocation(user.location || '');
      setWebsite(user.website || '');
      setAvatarUrl(user.avatar_template ? discourseApi.getAvatarUrl(user.avatar_template, 120) : null);
      setHasChanges(false);
    }
  }, [user]);

  // Auto-focus first field on mount
  React.useEffect(() => {
    if (user && !loading) {
      // Small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        displayNameRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, loading]);

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
          fileSize: asset.fileSize,
        } as { uri: string; type?: string; name?: string; fileSize?: number };
        const success = await uploadAvatar(imageFile);

        if (success) {
          showSuccess('Avatar updated', 'Your profile picture has been updated successfully.');
          await refreshUser();
          setHasChanges(true);
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
          { text: 'Discard', style: 'destructive', onPress: () => safeBack() }
        ]
      );
    } else {
      safeBack();
    }
  }, [hasChanges, safeBack]);

  // Get theme colors for header buttons
  const themeColors = React.useMemo(() => getThemeColors(isDark ? 'dark' : 'light', isAmoled), [isDark, isAmoled]);

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
      <X size={24} color={themeColors.foreground} weight="regular" />
    </TouchableOpacity>
  ), [handleCancel, themeColors.foreground]);

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
        <ActivityIndicator size="small" color={themeColors.accent} />
      ) : (
        <Check size={24} color={themeColors.accent} weight="bold" />
      )}
    </TouchableOpacity>
  ), [handleSave, hasChanges, isValid, updating, themeColors.accent, themeColors.foreground]);

  // Configure header with actions
  useFocusEffect(
    React.useCallback(() => {
      setHeader({
    title: "Edit Profile",
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
    onBackPress: handleCancel,
  }, [handleCancel]);

  if (loading) {
    return (
      <ScreenContainer variant="bg">
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
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
        <View style={styles.centered}>
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
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Avatar Section */}
          <View style={[styles.avatarSection, { backgroundColor: colors.card }]}>
            <View style={styles.avatarContainer}>
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
            </View>
            <Text style={[styles.avatarText, { color: colors.secondary }]}>
              Tap to change your profile picture
            </Text>
          </View>

          {/* Form Fields */}
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

            {/* Bio */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Bio</Text>
              <Input
                ref={bioRef}
                value={bio}
                onChangeText={(text) => {
                  // Enforce 500 character limit
                  const limitedText = text.length > 500 ? text.substring(0, 500) : text;
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
                style={StyleSheet.flatten([styles.input, styles.textArea])}
                accessibilityLabel="Bio"
                accessibilityHint={`Enter your bio. Current length: ${bio.length} of 500 characters maximum.`}
                accessibilityLiveRegion="polite"
              />
              <Text style={[styles.fieldHint, { color: colors.secondary }]}>
                {bio.length}/500 characters
              </Text>
              {(() => {
                const fieldValidation = getFieldValidation('bio');
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
  avatarSection: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
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
  avatarText: {
    fontSize: 14,
    textAlign: 'center',
  },
  formSection: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    marginTop: 4,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    width: '100%',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
