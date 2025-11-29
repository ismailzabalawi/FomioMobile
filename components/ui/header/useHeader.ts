import React, { useCallback } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useHeaderState, useHeaderDispatch, HeaderState, ScrollHandlerOptions } from './HeaderProvider';

export interface UseHeaderReturn {
  header: HeaderState;
  setHeader: (partial: Partial<HeaderState>) => void;
  resetHeader: () => void;
  setTitle: (title: string | React.ReactNode) => void;
  setSubtitle: (subtitle: string) => void;
  setTone: (tone: 'bg' | 'card' | 'transparent') => void;
  setProgress: (progress: number | undefined) => void;
  setActions: (rightActions: React.ReactNode[] | undefined) => void;
  setBackBehavior: (config: { canGoBack?: boolean; onBackPress?: () => void }) => void;
  setMeasuredHeight: (height: number) => void;
  registerScrollHandler: (
    handler: (event: NativeSyntheticEvent<NativeScrollEvent>) => void,
    options?: ScrollHandlerOptions
  ) => { onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void; unregister: () => void };
  /** Current scroll state - true when scrolled past threshold */
  isScrolled: boolean;
}

export function useHeader(): UseHeaderReturn {
  const { header } = useHeaderState();
  const { setHeader: setHeaderDispatch, resetHeader: resetHeaderDispatch, registerScrollHandler: registerScrollHandlerDispatch, setMeasuredHeight: setMeasuredHeightDispatch } = useHeaderDispatch();

  const setHeader = useCallback(
    (partial: Partial<HeaderState>) => {
      setHeaderDispatch(partial);
    },
    [setHeaderDispatch]
  );

  const resetHeader = useCallback(() => {
    resetHeaderDispatch();
  }, [resetHeaderDispatch]);

  const setTitle = useCallback(
    (title: string | React.ReactNode) => {
      setHeader({ title });
    },
    [setHeader]
  );

  const setSubtitle = useCallback(
    (subtitle: string) => {
      setHeader({ subtitle });
    },
    [setHeader]
  );

  const setTone = useCallback(
    (tone: 'bg' | 'card' | 'transparent') => {
      setHeader({ tone });
    },
    [setHeader]
  );

  const setProgress = useCallback(
    (progress: number | undefined) => {
      setHeader({ progress });
    },
    [setHeader]
  );

  const setActions = useCallback(
    (rightActions: React.ReactNode[] | undefined) => {
      setHeader({ rightActions });
    },
    [setHeader]
  );

  const setBackBehavior = useCallback(
    (config: { canGoBack?: boolean; onBackPress?: () => void }) => {
      setHeader({ canGoBack: config.canGoBack, onBackPress: config.onBackPress });
    },
    [setHeader]
  );

  const setMeasuredHeight = useCallback(
    (height: number) => {
      setMeasuredHeightDispatch(height);
    },
    [setMeasuredHeightDispatch]
  );

  const registerScrollHandler = useCallback(
    (
      handler: (event: NativeSyntheticEvent<NativeScrollEvent>) => void,
      options?: ScrollHandlerOptions
    ) => {
      return registerScrollHandlerDispatch(handler, options);
    },
    [registerScrollHandlerDispatch]
  );

  return {
    header,
    setHeader,
    resetHeader,
    setTitle,
    setSubtitle,
    setTone,
    setProgress,
    setActions,
    setBackBehavior,
    setMeasuredHeight,
    registerScrollHandler,
    isScrolled: header.isScrolled ?? false,
  };
}
