import React, { useCallback } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useHeaderState, useHeaderDispatch, HeaderState } from './HeaderProvider';

export interface UseHeaderReturn {
  header: HeaderState;
  setHeader: (partial: Partial<HeaderState>) => void;
  resetHeader: () => void;
  setTitle: (title: string | React.ReactNode) => void;
  setSubtitle: (subtitle: string) => void;
  setTone: (tone: 'bg' | 'card' | 'transparent') => void;
  setProgress: (progress: number | undefined) => void;
  setSubHeader: (subHeader: React.ReactNode | undefined) => void;
  setActions: (rightActions: React.ReactNode[] | undefined) => void;
  setBackBehavior: (config: { canGoBack?: boolean; onBackPress?: () => void }) => void;
  registerScrollHandler: (
    handler: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  ) => { onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void; unregister: () => void };
}

export function useHeader(): UseHeaderReturn {
  const { header } = useHeaderState();
  const { setHeader: setHeaderDispatch, resetHeader: resetHeaderDispatch, registerScrollHandler: registerScrollHandlerDispatch } = useHeaderDispatch();

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

  const setSubHeader = useCallback(
    (subHeader: React.ReactNode | undefined) => {
      setHeader({ subHeader });
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

  const registerScrollHandler = useCallback(
    (handler: (event: NativeSyntheticEvent<NativeScrollEvent>) => void) => {
      return registerScrollHandlerDispatch(handler);
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
    setSubHeader,
    setActions,
    setBackBehavior,
    registerScrollHandler,
  };
}
