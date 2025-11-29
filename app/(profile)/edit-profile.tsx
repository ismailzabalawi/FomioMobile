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
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AuthGate } from '../../components/shared/auth-gate';
import { AuthPromptView } from '../../components/shared/auth-prompt-view';
import { useDiscourseUser } from '../../shared/useDiscourseUser';
import { useAuth } from '@/shared/auth-context';
import { Avatar } from '../../components/ui/avatar';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Camera, X } from 'phosphor-react-native';
import { discourseApi } from '../../shared/discourseApi';
import { router } from 'expo-router';

export default function EditProfileScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { safeBack } = useSafeNavigation();
  const { user: authUser } = useAuth();
  const { user, settings, loading, updating, error, updateProfile, uploadAvatar, refreshUser } = useDiscourseUser(authUser?.username);
  
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio_raw || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

  const handleAvatarUpload = useCallback(async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'We need access to your photos to upload an avatar.',
            [{ text: 'OK' }]
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
          Alert.alert('Success', 'Avatar updated successfully!');
          await refreshUser();
          setHasChanges(true);
        } else {
          // Get error message from useDiscourseUser hook
          const errorMessage = error || 'Failed to upload avatar. Please try again.';
          Alert.alert('Error', errorMessage);
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
      Alert.alert('Error', 'An error occurred while uploading the avatar.');
      // Revert to original avatar
      if (user?.avatar_template) {
        setAvatarUrl(discourseApi.getAvatarUrl(user.avatar_template, 120));
      } else {
        setAvatarUrl(null);
      }
    } finally {
      setUploadingAvatar(false);
    }
  }, [uploadAvatar, refreshUser, user]);

  const handleSave = useCallback(async () => {
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
      Alert.alert(
        'Error', 
        'User data not available. Please refresh and try again.',
        [
          { text: 'Refresh', onPress: () => refreshUser() },
          { text: 'Cancel', style: 'cancel' }
        ]
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
      Alert.alert(
        'Error', 
        'User username is missing. Please refresh and try again.',
        [
          { text: 'Refresh', onPress: () => refreshUser() },
          { text: 'Cancel', style: 'cancel' }
        ]
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
        Alert.alert('No Changes', 'You haven\'t made any changes to save.');
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
        Alert.alert('Success', 'Profile updated successfully!');
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
        Alert.alert('Error', errorMessage);
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
      Alert.alert('Error', 'An error occurred while updating your profile.');
    }
  }, [user, displayName, bio, location, website, updateProfile, error, loading, authUser, refreshUser, safeBack]);

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

  // Configure header
  useScreenHeader({
    title: "Edit Profile",
    canGoBack: true,
    withSafeTop: false,
    tone: "bg",
    compact: true,
    titleFontSize: 20,
  }, []);

  useScreenBackBehavior({
    onBackPress: handleCancel,
  }, [handleCancel]);

  if (loading) {
    return (
      <ScreenContainer variant="bg">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
        </View>
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
                value={displayName}
                onChangeText={(text) => {
                  setDisplayName(text);
                  setHasChanges(true);
                }}
                placeholder="Enter your display name"
                style={styles.input}
              />
            </View>

            {/* Bio */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Bio</Text>
              <Input
                value={bio}
                onChangeText={(text) => {
                  // Enforce 500 character limit
                  const limitedText = text.length > 500 ? text.substring(0, 500) : text;
                  setBio(limitedText);
                  setHasChanges(true);
                }}
                placeholder="Tell us about yourself"
                multiline
                numberOfLines={4}
                style={StyleSheet.flatten([styles.input, styles.textArea])}
              />
              <Text style={[styles.fieldHint, { color: colors.secondary }]}>
                {bio.length}/500 characters
              </Text>
            </View>

            {/* Location */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Location</Text>
              <Input
                value={location}
                onChangeText={(text) => {
                  setLocation(text);
                  setHasChanges(true);
                }}
                placeholder="Your location"
                style={styles.input}
              />
            </View>

            {/* Website */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Website</Text>
              <Input
                value={website}
                onChangeText={(text) => {
                  setWebsite(text);
                  setHasChanges(true);
                }}
                placeholder="https://yourwebsite.com"
                keyboardType="url"
                autoCapitalize="none"
                style={styles.input}
              />
              {website && !website.match(/^https?:\/\/.+\..+/) && (
                <Text style={[styles.fieldHint, { color: colors.error }]}>
                  Please enter a valid URL (e.g., https://example.com)
                </Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              variant="outline"
              onPress={handleCancel}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onPress={handleSave}
              disabled={!hasChanges || updating}
              loading={updating}
              style={styles.saveButton}
            >
              Save Changes
            </Button>
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
  input: {
    width: '100%',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
