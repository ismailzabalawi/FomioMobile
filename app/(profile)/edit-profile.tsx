import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { AppHeader } from '@/components/ui/AppHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AuthGate } from '../../components/shared/auth-gate';
import { AuthPromptView } from '../../components/shared/auth-prompt-view';
import { useDiscourseUser } from '../../shared/useDiscourseUser';
import { useAuth } from '../../shared/useAuth';
import { Avatar } from '../../components/ui/avatar';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Camera, X } from 'phosphor-react-native';
import { discourseApi } from '../../shared/discourseApi';
import { router } from 'expo-router';

export default function EditProfileScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { user: authUser } = useAuth();
  const { user, settings, loading, updating, error, updateProfile, uploadAvatar, refreshUser } = useDiscourseUser(authUser?.username);
  
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio_raw || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
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
          Alert.alert('Error', 'Failed to upload avatar. Please try again.');
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
    if (!user?.username) return;

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

      const success = await updateProfile(updates);
      
      if (success) {
        Alert.alert('Success', 'Profile updated successfully!');
        setHasChanges(false);
        router.back();
      } else {
        Alert.alert('Error', error || 'Failed to update profile. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', 'An error occurred while updating your profile.');
    }
  }, [user, displayName, bio, location, website, updateProfile, error]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  }, [hasChanges]);

  if (loading) {
    return (
      <ScreenContainer variant="bg">
        <AppHeader 
          title="Edit Profile" 
          canGoBack
          tone="bg"
          withSafeTop={false}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <ScreenContainer variant="bg">
        <AppHeader 
          title="Edit Profile" 
          canGoBack
          tone="bg"
          withSafeTop={false}
        />
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.error }]}>Failed to load profile</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer variant="bg">
      <AppHeader 
        title="Edit Profile" 
        canGoBack
        onBackPress={handleCancel}
        withSafeTop={false}
      />
      <AuthGate
        fallback={
          <AuthPromptView
            title="Sign in to edit your profile"
            subtitle="Log in to update your profile information and preferences"
          />
        }
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={[styles.avatarSection, { backgroundColor: colors.card }]}>
            <View style={styles.avatarContainer}>
              <Avatar
                source={avatarUrl ? { uri: avatarUrl } : undefined}
                fallback={user.username.charAt(0).toUpperCase()}
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
                value={user.username}
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
                  setBio(text);
                  setHasChanges(true);
                }}
                placeholder="Tell us about yourself"
                multiline
                numberOfLines={4}
                style={StyleSheet.flatten([styles.input, styles.textArea])}
              />
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
