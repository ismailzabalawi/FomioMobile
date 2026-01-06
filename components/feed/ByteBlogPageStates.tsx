import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FileX } from 'phosphor-react-native';
import { router } from 'expo-router';
import { ByteBlogPageSkeleton } from './ByteBlogPageSkeleton';

/**
 * Loading state component for ByteBlogPage
 */
export function ByteBlogPageLoading({ isDark }: { isDark: boolean }) {
  return <ByteBlogPageSkeleton isDark={isDark} />;
}

/**
 * Error state component for ByteBlogPage
 */
export function ByteBlogPageError({ 
  errorMessage, 
  retry, 
  isDark 
}: { 
  errorMessage?: string; 
  retry: () => void; 
  isDark: boolean;
}) {
  return (
    <View className="flex-1 justify-center items-center p-5 bg-fomio-bg dark:bg-fomio-bg-dark">
      <Text className="text-base text-center mb-5 text-fomio-danger dark:text-fomio-danger-dark">
        {errorMessage || 'Failed to load topic'}
      </Text>
      <TouchableOpacity 
        onPress={retry} 
        className="bg-fomio-primary dark:bg-fomio-primary-dark py-2.5 px-5 rounded-lg"
      >
        <Text className="text-white text-base font-semibold">Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Not found state component for ByteBlogPage
 */
export function ByteBlogPageNotFound({ isDark }: { isDark: boolean }) {
  const handleGoBack = () => {
    router.back();
  };

  return (
    <View className="flex-1 justify-center items-center p-5 bg-fomio-bg dark:bg-fomio-bg-dark">
      <FileX 
        size={64} 
        weight="regular" 
        color={isDark ? '#9CA3AF' : '#64748B'}
        style={{ marginBottom: 16, opacity: 0.6 }}
      />
      <Text className="text-title font-bold mb-2 text-fomio-foreground dark:text-fomio-foreground-dark text-center">
        Byte Not Found
      </Text>
      <Text className="text-body text-center mb-6 text-fomio-muted dark:text-fomio-muted-dark px-4">
        This Byte may have been removed or moved. It's no longer available.
      </Text>
      <TouchableOpacity 
        onPress={handleGoBack} 
        className="bg-fomio-primary dark:bg-fomio-primary-dark py-2.5 px-6 rounded-lg"
        activeOpacity={0.7}
      >
        <Text className="text-white text-base font-semibold">Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}
