import React from 'react';
import {
  Switch as RNSwitch,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';

export interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function Switch({
  checked = false,
  onCheckedChange,
  disabled = false,
  size = 'md',
  style,
}: SwitchProps) {
  const containerStyle = [
    styles.container,
    styles[`${size}Container` as keyof typeof styles],
    style,
  ];

  const switchStyle = [
    styles.switch,
    styles[`${size}Switch` as keyof typeof styles],
  ];

  return (
    <View style={containerStyle}>
      <RNSwitch
        style={switchStyle}
        value={checked}
        onValueChange={onCheckedChange}
        disabled={disabled}
        trackColor={{
          false: '#d1d5db',
          true: '#009688',
        }}
        thumbColor={checked ? '#ffffff' : '#ffffff'}
        ios_backgroundColor="#d1d5db"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  switch: {
    // Base switch styles
  },
  
  // Size styles
  smContainer: {
    // Small container styles
  },
  mdContainer: {
    // Medium container styles
  },
  lgContainer: {
    // Large container styles
  },
  
  smSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  mdSwitch: {
    transform: [{ scaleX: 1 }, { scaleY: 1 }],
  },
  lgSwitch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
});
