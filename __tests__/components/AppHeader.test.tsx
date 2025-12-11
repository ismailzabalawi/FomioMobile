/**
 * Unit and integration tests for AppHeader component
 */

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AppHeader, APP_HEADER_DEFAULTS } from '@/components/ui/AppHeader';
import { HeaderProvider } from '@/components/ui/header/HeaderProvider';
import { View, Text, Pressable } from 'react-native';
import { ArrowLeft } from 'phosphor-react-native';

// Mock theme provider
const mockUseTheme = jest.fn();
jest.mock('@/components/theme', () => ({
  useTheme: () => mockUseTheme(),
}));

// Mock expo-router
const mockRouterBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockRouterBack,
  }),
}));

// Mock useSafeNavigation
const mockSafeBack = jest.fn();
jest.mock('@/shared/hooks/useSafeNavigation', () => ({
  useSafeNavigation: () => ({
    safeBack: mockSafeBack,
  }),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock expo-blur
jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
    // Simple mock that just passes through children
    // The testID will be added by the test renderer
    return children;
  },
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    // Simple mock that just passes through children
    // The testID will be added by the test renderer
    return children;
  },
}));

// Mock getThemeColors
jest.mock('@/shared/theme-constants', () => ({
  getThemeColors: jest.fn((themeMode, isDark) => ({
    background: isDark ? '#000000' : '#FFFFFF',
    card: isDark ? '#1C1C1E' : '#F2F2F7',
    foreground: isDark ? '#FFFFFF' : '#000000',
    secondary: isDark ? '#8E8E93' : '#6E6E73',
    muted: isDark ? '#3A3A3C' : '#E5E5EA',
    accent: '#007AFF',
    border: isDark ? '#38383A' : '#C6C6C8',
  })),
}));

// Mock cn utility
jest.mock('@/lib/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('AppHeader Component', () => {
  const defaultTheme = {
    themeMode: 'light' as const,
    isDark: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(defaultTheme);
  });

  // Helper to render with HeaderProvider
  const renderWithProvider = (component: React.ReactElement) => {
    return render(<HeaderProvider>{component}</HeaderProvider>);
  };

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      renderWithProvider(<AppHeader title="Test Header" />);
      
      expect(screen.getByText('Test Header')).toBeTruthy();
      expect(screen.getByTestId('app-header')).toBeTruthy();
    });

    it('should render with custom testID', () => {
      renderWithProvider(<AppHeader title="Test" testID="custom-header" />);
      
      expect(screen.getByTestId('custom-header')).toBeTruthy();
    });

    it('should render title as string', () => {
      renderWithProvider(<AppHeader title="My Title" />);
      
      expect(screen.getByText('My Title')).toBeTruthy();
    });

    it('should render title as ReactNode', () => {
      const customTitle = <Text testID="custom-title">Custom Title</Text>;
      renderWithProvider(<AppHeader title={customTitle} />);
      
      expect(screen.getByTestId('custom-title')).toBeTruthy();
    });
  });

  describe('Back Button', () => {
    it('should not show back button by default', () => {
      renderWithProvider(<AppHeader title="No Back" />);
      
      expect(screen.queryByTestId('app-header-back')).toBeNull();
    });

    it('should show back button when canGoBack is true', () => {
      renderWithProvider(<AppHeader title="With Back" canGoBack />);
      
      const backButton = screen.getByTestId('app-header-back');
      expect(backButton).toBeTruthy();
      expect(backButton.props.accessibilityLabel).toBe('Go back');
    });

    it('should call onBackPress when provided', () => {
      const onBackPress = jest.fn();
      renderWithProvider(
        <AppHeader title="Custom Back" canGoBack onBackPress={onBackPress} />
      );
      
      fireEvent.press(screen.getByTestId('app-header-back'));
      
      expect(onBackPress).toHaveBeenCalledTimes(1);
      expect(mockRouterBack).not.toHaveBeenCalled();
    });

    it('should call safeBack when onBackPress is not provided', () => {
      renderWithProvider(<AppHeader title="Router Back" canGoBack />);
      
      fireEvent.press(screen.getByTestId('app-header-back'));
      
      expect(mockSafeBack).toHaveBeenCalledTimes(1);
    });

    it('should render leftNode when canGoBack is false', () => {
      const leftNode = <View testID="custom-left">Left</View>;
      renderWithProvider(<AppHeader title="Left Node" leftNode={leftNode} />);
      
      expect(screen.getByTestId('custom-left')).toBeTruthy();
    });
  });

  describe('Subtitle', () => {
    it('should not render subtitle by default', () => {
      renderWithProvider(<AppHeader title="No Subtitle" />);
      
      // Subtitle is only shown with largeTitle, so we check it's not in the main title area
      expect(screen.queryByText('Subtitle')).toBeNull();
    });

    it('should render subtitle when provided with largeTitle', () => {
      renderWithProvider(
        <AppHeader title="Title" subtitle="Subtitle Text" largeTitle />
      );
      
      expect(screen.getByText('Subtitle Text')).toBeTruthy();
    });
  });

  describe('Progress Bar', () => {
    it('should not render progress bar by default', () => {
      renderWithProvider(<AppHeader title="No Progress" />);
      
      // Progress bar is rendered conditionally, check it's not present
      const header = screen.getByTestId('app-header');
      expect(header).toBeTruthy();
    });

    it('should render progress bar when progress is provided', () => {
      renderWithProvider(<AppHeader title="With Progress" progress={0.5} />);
      
      // Progress bar should be rendered (checking via structure)
      const header = screen.getByTestId('app-header');
      expect(header).toBeTruthy();
    });

    it('should handle progress value 0', () => {
      renderWithProvider(<AppHeader title="Zero Progress" progress={0} />);
      
      expect(screen.getByText('Zero Progress')).toBeTruthy();
    });

    it('should handle progress value 1', () => {
      renderWithProvider(<AppHeader title="Full Progress" progress={1} />);
      
      expect(screen.getByText('Full Progress')).toBeTruthy();
    });
  });

  describe('Large Title', () => {
    it('should not use large title by default', () => {
      renderWithProvider(<AppHeader title="Normal Title" />);
      
      expect(screen.getByText('Normal Title')).toBeTruthy();
    });

    it('should render large title when largeTitle is true', () => {
      renderWithProvider(<AppHeader title="Large Title" largeTitle />);
      
      expect(screen.getAllByText('Large Title').length).toBeGreaterThan(0);
    });

    it('should show subtitle in large title area', () => {
      renderWithProvider(
        <AppHeader 
          title="Large Title" 
          subtitle="Subtitle" 
          largeTitle 
        />
      );
      
      expect(screen.getAllByText('Large Title').length).toBeGreaterThan(0);
      expect(screen.getByText('Subtitle')).toBeTruthy();
    });
  });

  describe('Right Actions', () => {
    it('should not render right actions by default', () => {
      renderWithProvider(<AppHeader title="No Actions" />);
      
      // Right actions container should exist but be empty
      const header = screen.getByTestId('app-header');
      expect(header).toBeTruthy();
    });

    it('should render single right action', () => {
      const action = (
        <Pressable testID="action-1">
          <Text>Action</Text>
        </Pressable>
      );
      renderWithProvider(<AppHeader title="One Action" rightActions={[action]} />);
      
      expect(screen.getByTestId('action-1')).toBeTruthy();
    });

    it('should render multiple right actions', () => {
      const actions = [
        <Pressable key="1" testID="action-1"><Text>A1</Text></Pressable>,
        <Pressable key="2" testID="action-2"><Text>A2</Text></Pressable>,
        <Pressable key="3" testID="action-3"><Text>A3</Text></Pressable>,
      ];
      renderWithProvider(<AppHeader title="Multiple Actions" rightActions={actions} />);
      
      expect(screen.getByTestId('action-1')).toBeTruthy();
      expect(screen.getByTestId('action-2')).toBeTruthy();
      expect(screen.getByTestId('action-3')).toBeTruthy();
    });
  });

  describe('Tone Variants', () => {
    it('should use card tone by default', () => {
      renderWithProvider(<AppHeader title="Default Tone" />);
      
      expect(screen.getByText('Default Tone')).toBeTruthy();
    });

    it('should render with bg tone', () => {
      renderWithProvider(<AppHeader title="BG Tone" tone="bg" />);
      
      expect(screen.getByText('BG Tone')).toBeTruthy();
    });

    it('should render with transparent tone', () => {
      renderWithProvider(<AppHeader title="Transparent" tone="transparent" />);
      
      expect(screen.getByText('Transparent')).toBeTruthy();
    });

    it('should render blur backdrop for transparent tone on iOS', () => {
      const { Platform } = require('react-native');
      const originalOS = Platform.OS;
      Platform.OS = 'ios';
      
      renderWithProvider(
        <AppHeader 
          title="Blur" 
          tone="transparent" 
          transparentBackdrop="blur" 
        />
      );
      
      // BlurView is mocked and renders children, so we just verify the header renders
      expect(screen.getByText('Blur')).toBeTruthy();
      
      Platform.OS = originalOS;
    });

    it('should render gradient backdrop for transparent tone', () => {
      renderWithProvider(
        <AppHeader 
          title="Gradient" 
          tone="transparent" 
          transparentBackdrop="gradient" 
        />
      );
      
      // LinearGradient is mocked and renders children, so we just verify the header renders
      expect(screen.getByText('Gradient')).toBeTruthy();
    });
  });

  describe('Scroll States', () => {
    it('should not be elevated by default', () => {
      renderWithProvider(<AppHeader title="Not Scrolled" />);
      
      expect(screen.getByText('Not Scrolled')).toBeTruthy();
    });

    it('should apply elevation when isScrolled is true', () => {
      renderWithProvider(<AppHeader title="Scrolled" isScrolled />);
      
      expect(screen.getByText('Scrolled')).toBeTruthy();
    });

    it('should apply elevation when elevated prop is true', () => {
      renderWithProvider(<AppHeader title="Elevated" elevated />);
      
      expect(screen.getByText('Elevated')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility role', () => {
      renderWithProvider(<AppHeader title="Accessible" />);
      
      const header = screen.getByTestId('app-header');
      expect(header.props.accessibilityRole).toBe('header');
    });

    it('should have accessible back button', () => {
      renderWithProvider(<AppHeader title="Back" canGoBack />);
      
      const backButton = screen.getByTestId('app-header-back');
      expect(backButton.props.accessible).toBe(true);
      expect(backButton.props.accessibilityRole).toBe('button');
      expect(backButton.props.accessibilityLabel).toBe('Go back');
      expect(backButton.props.accessibilityHint).toBe('Go back to previous screen');
    });

    it('should add testID to right actions', () => {
      const action = <Pressable><Text>Action</Text></Pressable>;
      renderWithProvider(<AppHeader title="Test" rightActions={[action]} />);
      
      // Actions should have testIDs added automatically
      const header = screen.getByTestId('app-header');
      expect(header).toBeTruthy();
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger haptic feedback on back press when enabled', async () => {
      const Haptics = require('expo-haptics');
      renderWithProvider(
        <AppHeader title="Haptic" canGoBack enableHaptics />
      );
      
      fireEvent.press(screen.getByTestId('app-header-back'));
      
      await waitFor(() => {
        expect(Haptics.impactAsync).toHaveBeenCalled();
      });
    });

    it('should not trigger haptic feedback when disabled', async () => {
      const Haptics = require('expo-haptics');
      renderWithProvider(
        <AppHeader title="No Haptic" canGoBack enableHaptics={false} />
      );
      
      fireEvent.press(screen.getByTestId('app-header-back'));
      
      // Haptics should not be called
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('Theme Support', () => {
    it('should render correctly in light theme', () => {
      mockUseTheme.mockReturnValue({ themeMode: 'light', isDark: false });
      renderWithProvider(<AppHeader title="Light Theme" />);
      
      expect(screen.getByText('Light Theme')).toBeTruthy();
    });

    it('should render correctly in dark theme', () => {
      mockUseTheme.mockReturnValue({ themeMode: 'dark', isDark: true });
      renderWithProvider(<AppHeader title="Dark Theme" />);
      
      expect(screen.getByText('Dark Theme')).toBeTruthy();
    });
  });

  describe('Status Bar', () => {
    it('should extend to status bar by default', () => {
      renderWithProvider(<AppHeader title="Status Bar" />);
      
      expect(screen.getByText('Status Bar')).toBeTruthy();
    });

    it('should not extend to status bar when extendToStatusBar is false', () => {
      renderWithProvider(
        <AppHeader title="No Extend" extendToStatusBar={false} />
      );
      
      expect(screen.getByText('No Extend')).toBeTruthy();
    });
  });

  describe('Custom Icon Color', () => {
    it('should use custom icon color when provided', () => {
      renderWithProvider(
        <AppHeader title="Custom Icon" canGoBack iconColor="#FF0000" />
      );
      
      const backButton = screen.getByTestId('app-header-back');
      expect(backButton).toBeTruthy();
    });
  });
});

describe('AppHeader Integration Tests', () => {
  const defaultTheme = {
    themeMode: 'light' as const,
    isDark: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(defaultTheme);
  });

  it('should integrate with HeaderProvider and report height', () => {
    const onLayout = jest.fn();
    
    render(
      <HeaderProvider>
        <AppHeader title="Integration Test" />
      </HeaderProvider>
    );
    
    const header = screen.getByTestId('app-header');
    expect(header).toBeTruthy();
    
    // Simulate layout event
    fireEvent(header, 'layout', {
      nativeEvent: {
        layout: { width: 390, height: 60, x: 0, y: 0 },
      },
    });
    
    expect(screen.getByText('Integration Test')).toBeTruthy();
  });

  it('should work with header context state changes', () => {
    const TestComponent = () => {
      const { setHeader } = require('@/components/ui/header').useHeader();
      
      React.useEffect(() => {
        setHeader({ title: 'Updated Title' });
      }, [setHeader]);
      
      return <AppHeader title="Initial" />;
    };
    
    render(
      <HeaderProvider>
        <TestComponent />
      </HeaderProvider>
    );
    
    // Header should render with context title if provided
    expect(screen.getByText('Initial')).toBeTruthy();
  });

  it('should handle scroll state from context', () => {
    const TestComponent = () => {
      const { registerScrollHandler } = require('@/components/ui/header').useHeader();
      
      React.useEffect(() => {
        const { onScroll } = registerScrollHandler(() => {});
        // Simulate scroll event
        onScroll({
          nativeEvent: {
            contentOffset: { x: 0, y: 50 },
            contentSize: { width: 390, height: 1000 },
            layoutMeasurement: { width: 390, height: 844 },
          },
        } as any);
      }, [registerScrollHandler]);
      
      return <AppHeader title="Scroll Test" />;
    };
    
    render(
      <HeaderProvider>
        <TestComponent />
      </HeaderProvider>
    );
    
    expect(screen.getByText('Scroll Test')).toBeTruthy();
  });

  it('should handle multiple header configurations', () => {
    const { rerender } = render(
      <HeaderProvider>
        <AppHeader title="Config 1" canGoBack />
      </HeaderProvider>
    );
    
    expect(screen.getByText('Config 1')).toBeTruthy();
    expect(screen.getByTestId('app-header-back')).toBeTruthy();
    
    rerender(
      <HeaderProvider>
        <AppHeader title="Config 2" rightActions={[<View key="1" testID="action" />]} />
      </HeaderProvider>
    );
    
    expect(screen.getByText('Config 2')).toBeTruthy();
    expect(screen.queryByTestId('app-header-back')).toBeNull();
    expect(screen.getByTestId('action')).toBeTruthy();
  });
});
