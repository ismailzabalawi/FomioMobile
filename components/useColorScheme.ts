import { useColorScheme as useRNColorScheme, ColorSchemeName } from 'react-native';

export function useColorScheme(): ColorSchemeName {
  return useRNColorScheme();
}
