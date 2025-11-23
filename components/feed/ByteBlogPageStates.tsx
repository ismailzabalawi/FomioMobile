import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

/**
 * Loading state component for ByteBlogPage
 */
export function ByteBlogPageLoading({ isDark }: { isDark: boolean }) {
  return (
    <View className="flex-1 justify-center items-center bg-fomio-bg dark:bg-fomio-bg-dark">
      <ActivityIndicator size="large" color={isDark ? '#60a5fa' : '#2563EB'} />
      <Text className="mt-2.5 text-base text-fomio-foreground dark:text-fomio-foreground-dark">
        Loading topic...
      </Text>
    </View>
  );
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
  return (
    <View className="flex-1 justify-center items-center p-5 bg-fomio-bg dark:bg-fomio-bg-dark">
      <Text className="text-base text-fomio-foreground dark:text-fomio-foreground-dark">
        Topic not found
      </Text>
    </View>
  );
}

