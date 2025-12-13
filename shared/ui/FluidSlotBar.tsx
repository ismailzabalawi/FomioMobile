import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { getTokens } from '../design/tokens';

type SlotConfig = {
  key: string;
  flex?: number;
  width?: number;
  visible?: boolean;
  render: () => React.ReactNode;
};

type Props = {
  mode?: 'light' | 'dark';
  slots: SlotConfig[];
  height?: number;
  radius?: number;
};

export function FluidSlotBar({ mode = 'dark', slots, height = 60, radius = 24 }: Props) {
  const tokens = useMemo(() => getTokens(mode), [mode]);

  return (
    <View
      style={[
        styles.container,
        { height, borderRadius: radius, backgroundColor: tokens.colors.surfaceFrost },
        tokens.shadows.soft,
      ]}
    >
      {slots.map((slot) => {
        const animatedStyle = useAnimatedStyle(() => {
          const targetWidth = slot.visible === false ? 0 : slot.width ?? 0;
          const targetFlex = slot.visible === false ? 0 : slot.flex ?? 1;
          return {
            width: targetWidth || undefined,
            flex: targetWidth ? undefined : targetFlex,
            opacity: withSpring(slot.visible === false ? 0 : 1, tokens.motion.liquidSpring),
          };
        }, [slot.visible, slot.width, slot.flex]);

        return (
          <Animated.View key={slot.key} style={[styles.slot, animatedStyle]}>
            {slot.render()}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  slot: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
