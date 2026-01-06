import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/components/theme';

interface GradientAvatarProps {
  username: string;
  size?: number;
  className?: string;
}

/**
 * GradientAvatar - Generates consistent gradient background from username hash
 * 
 * UI Spec: GradientAvatar
 * - Generates consistent gradient colors from username hash (like Telegram/Discord)
 * - Uses LinearGradient for smooth color transitions
 * - Shows uppercase initial letter
 * - Themed text color for contrast
 * - Reusable across the app
 */
export function GradientAvatar({ username, size = 32, className = '' }: GradientAvatarProps) {
  const { isDark, isAmoled } = useTheme();
  
  // Generate consistent colors from username hash
  const { colors, textColor } = useMemo(() => {
    // Simple hash function to convert username to number
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate two colors from hash
    const hue1 = Math.abs(hash) % 360;
    const hue2 = (hue1 + 60) % 360; // Complementary color
    
    // Convert HSL to RGB for gradient
    const hslToRgb = (h: number, s: number, l: number): string => {
      h /= 360;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => {
        const k = (n + h * 12) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };
    
    // Use vibrant but readable colors
    const color1 = hslToRgb(hue1, 0.7, 0.5);
    const color2 = hslToRgb(hue2, 0.7, 0.5);
    
    // Determine text color based on background brightness
    const getLuminance = (hex: string): number => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const avgLuminance = (getLuminance(color1) + getLuminance(color2)) / 2;
    const textColor = avgLuminance > 0.5 ? '#000000' : '#FFFFFF';
    
    return {
      colors: [color1, color2] as [string, string],
      textColor,
    };
  }, [username]);
  
  const initial = username.charAt(0).toUpperCase();
  const fontSize = size * 0.5;
  
  return (
    <View 
      className={`rounded-full justify-center items-center ${className}`}
      style={{ width: size, height: size }}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize,
            fontWeight: '700',
            color: textColor,
          }}
        >
          {initial}
        </Text>
      </LinearGradient>
    </View>
  );
}

