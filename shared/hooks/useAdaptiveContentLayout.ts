import { useMemo } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';
import { useFoldableLayout } from '@/shared/hooks/useFoldableLayout';

interface AdaptiveContentOptions {
  maxWidth?: number;
  widthRatio?: number;
  minHorizontalPadding?: number;
  minWidthForConstraint?: number;
  constrainForHinge?: boolean;
}

interface AdaptiveContentLayout {
  contentContainerStyle: ViewStyle;
  contentWidth: number;
  sidePadding: number;
}

export function useAdaptiveContentLayout(
  options: AdaptiveContentOptions = {}
): AdaptiveContentLayout {
  const { width } = useWindowDimensions();
  const { paddingLeft, paddingRight, hinge } = useFoldableLayout();
  const {
    maxWidth = 10000,
    widthRatio = 1,
    minHorizontalPadding = 8,
    minWidthForConstraint = 100000,
    constrainForHinge = false,
  } = options;

  return useMemo(() => {
    const hasVerticalHinge =
      hinge.isSeparating &&
      hinge.orientation === 'VERTICAL' &&
      Boolean(hinge.bounds);
    const shouldConstrain = width >= minWidthForConstraint || (constrainForHinge && hasVerticalHinge);

    if (!shouldConstrain) {
      return {
        contentContainerStyle: {
          paddingLeft: paddingLeft + minHorizontalPadding,
          paddingRight: paddingRight + minHorizontalPadding,
          width: '100%',
          alignSelf: 'stretch',
        },
        contentWidth: width,
        sidePadding: minHorizontalPadding,
      };
    }

    const hingePenalty =
      hasVerticalHinge && hinge.bounds
        ? Math.max(0, hinge.bounds.width)
        : 0;
    const safeHorizontal = paddingLeft + paddingRight;
    const availableWidth = Math.max(
      0,
      width - safeHorizontal - minHorizontalPadding * 2 - hingePenalty
    );
    const contentWidth = Math.min(maxWidth, Math.floor(availableWidth * widthRatio));
    const sidePadding = Math.max(
      minHorizontalPadding,
      (availableWidth - contentWidth) / 2 + minHorizontalPadding
    );

    return {
      contentContainerStyle: {
        paddingLeft: paddingLeft + sidePadding,
        paddingRight: paddingRight + sidePadding,
        width: '100%',
        maxWidth: contentWidth,
        alignSelf: 'center',
      },
      contentWidth,
      sidePadding,
    };
  }, [
    width,
    paddingLeft,
    paddingRight,
    hinge.isSpanning,
    hinge.isSeparating,
    hinge.orientation,
    hinge.bounds,
    maxWidth,
    widthRatio,
    minHorizontalPadding,
    minWidthForConstraint,
    constrainForHinge,
  ]);
}
