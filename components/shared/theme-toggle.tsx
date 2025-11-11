import React from 'react';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Switch
      checked={theme === 'dark'}
      onCheckedChange={handleToggle}
      disabled={false}
    />
  );
}
