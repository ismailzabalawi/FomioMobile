// UI Spec: EditProfileSkeleton
// - Loading skeleton for edit profile form
// - Matches edit profile form layout structure
// - Avatar circle + camera button placeholder
// - Text input skeletons for each field
// - Uses SkeletonEnhanced for shimmer animation

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonEnhanced } from '@/components/shared/loading.enhanced';

export function EditProfileSkeleton() {
  return (
    <View style={styles.container}>
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          <SkeletonEnhanced 
            width={120} 
            height={120} 
            borderRadius={60} 
          />
          {/* Camera button placeholder */}
          <View style={styles.cameraButtonPlaceholder}>
            <SkeletonEnhanced 
              width={36} 
              height={36} 
              borderRadius={18} 
            />
          </View>
        </View>
        <SkeletonEnhanced 
          width={200} 
          height={16} 
          borderRadius={4}
          style={{ marginTop: 12 }}
        />
      </View>

      {/* Form Fields */}
      <View style={styles.formSection}>
        {/* Username skeleton */}
        <View style={styles.fieldContainer}>
          <SkeletonEnhanced 
            width={100} 
            height={16} 
            borderRadius={4}
            style={{ marginBottom: 8 }}
          />
          <SkeletonEnhanced 
            width="100%" 
            height={44} 
            borderRadius={8}
          />
          <SkeletonEnhanced 
            width={180} 
            height={12} 
            borderRadius={4}
            style={{ marginTop: 4 }}
          />
        </View>

        {/* Display Name skeleton */}
        <View style={styles.fieldContainer}>
          <SkeletonEnhanced 
            width={120} 
            height={16} 
            borderRadius={4}
            style={{ marginBottom: 8 }}
          />
          <SkeletonEnhanced 
            width="100%" 
            height={44} 
            borderRadius={8}
          />
        </View>

        {/* Bio skeleton */}
        <View style={styles.fieldContainer}>
          <SkeletonEnhanced 
            width={40} 
            height={16} 
            borderRadius={4}
            style={{ marginBottom: 8 }}
          />
          <SkeletonEnhanced 
            width="100%" 
            height={100} 
            borderRadius={8}
          />
          <SkeletonEnhanced 
            width={80} 
            height={12} 
            borderRadius={4}
            style={{ marginTop: 4 }}
          />
        </View>

        {/* Location skeleton */}
        <View style={styles.fieldContainer}>
          <SkeletonEnhanced 
            width={80} 
            height={16} 
            borderRadius={4}
            style={{ marginBottom: 8 }}
          />
          <SkeletonEnhanced 
            width="100%" 
            height={44} 
            borderRadius={8}
          />
        </View>

        {/* Website skeleton */}
        <View style={styles.fieldContainer}>
          <SkeletonEnhanced 
            width={70} 
            height={16} 
            borderRadius={4}
            style={{ marginBottom: 8 }}
          />
          <SkeletonEnhanced 
            width="100%" 
            height={44} 
            borderRadius={8}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  cameraButtonPlaceholder: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  formSection: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
});

