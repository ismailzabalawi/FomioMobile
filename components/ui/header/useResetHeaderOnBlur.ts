import React from 'react';
import { useFocusEffect } from 'expo-router';
import { useHeader } from './useHeader';

/**
 * Hook that automatically resets header state when the screen loses focus.
 * Useful for ensuring headers don't persist between navigations.
 */
export function useResetHeaderOnBlur() {
  const { resetHeader } = useHeader();

  useFocusEffect(
    React.useCallback(() => {
      // Reset header when screen loses focus
      return () => {
        resetHeader();
      };
    }, [resetHeader])
  );
}


