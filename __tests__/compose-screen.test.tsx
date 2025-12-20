import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ComposeScreen from '../app/(tabs)/compose';

const mockTeret = {
  id: 1,
  name: 'Design',
  parent_category_id: 10,
  parent_category: { name: 'Hub' },
};

const mockSaveDraft = jest.fn().mockResolvedValue({ success: true, data: {} });
const mockDeleteDraft = jest.fn().mockResolvedValue({ success: true });
const mockGetDraft = jest.fn().mockResolvedValue({ success: false });
const mockUploadImage = jest.fn().mockResolvedValue({ success: true, data: { url: 'https://example.com/img.jpg' } });
const mockCreateTopic = jest.fn().mockResolvedValue({ success: true });

jest.mock('../shared/discourseApi', () => ({
  discourseApi: {
    saveDraft: mockSaveDraft,
    deleteDraft: mockDeleteDraft,
    getDraft: mockGetDraft,
    uploadImage: mockUploadImage,
  },
}));

jest.mock('../lib/discourse', () => ({
  createTopic: (...args: any[]) => mockCreateTopic(...args),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('../shared/useTerets', () => ({
  useTerets: () => ({
    terets: [mockTeret],
    allCategories: [mockTeret],
    isLoading: false,
    errorMessage: '',
    refreshTerets: jest.fn(),
  }),
  Teret: {},
}));

jest.mock('../shared/auth-context', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { username: 'tester' },
  }),
}));

jest.mock('../shared/useDiscourseSettings', () => ({
  useDiscourseSettings: () => ({ minTitle: 5, minPost: 10, loading: false }),
}));

jest.mock('../shared/useSettingsStorage', () => ({
  useSettingsStorage: () => ({ settings: { autoSave: false }, loading: false }),
}));

jest.mock('../shared/hooks/useComposeHeader', () => ({
  useComposeHeader: jest.fn(),
}));

jest.mock('../shared/hooks/useSafeNavigation', () => ({
  useSafeNavigation: () => ({ safeBack: jest.fn() }),
}));

jest.mock('../components/theme', () => ({
  useTheme: () => ({
    isDark: false,
    navigationTheme: {
      colors: { card: '#ffffff', background: '#ffffff' },
    },
  }),
}));

jest.mock('../components/terets/TeretPickerSheet', () => ({
  TeretPickerSheet: ({ visible, onSelect, onClose }: any) => {
    const React = require('react');
    React.useEffect(() => {
      onSelect(mockTeret);
      onClose?.();
    }, [onSelect, onClose]);
    return null;
  },
}));

jest.mock('../components/compose', () => {
  const React = require('react');
  const { TextInput, View, Text } = require('react-native');
  return {
    ComposeEditor: ({
      title,
      body,
      onChangeTitle,
      onChangeBody,
      titleError,
      bodyError,
      onTeretPress,
    }: any) => (
      <View>
        <TextInput testID="title-input" value={title} onChangeText={onChangeTitle} />
        {titleError ? <Text testID="title-error">{titleError}</Text> : null}
        <TextInput testID="body-input" value={body} onChangeText={onChangeBody} />
        {bodyError ? <Text testID="body-error">{bodyError}</Text> : null}
        <Text testID="teret-row" onPress={onTeretPress}>
          Teret
        </Text>
      </View>
    ),
    MediaGrid: () => null,
    useImagePicker: () => ({ pickImages: jest.fn(), isPicking: false }),
    HelpSheet: () => null,
  };
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

describe('ComposeScreen', () => {
  it('disables Post until title, body, and teret are provided', async () => {
    const { getByTestId } = render(<ComposeScreen />);

    const postButton = getByTestId('post-button');
    expect(postButton.props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(getByTestId('title-input'), 'Hello world');
    fireEvent.changeText(getByTestId('body-input'), 'This is a long enough body to post.');

    await waitFor(() => {
      expect(getByTestId('post-button').props.accessibilityState?.disabled).toBe(false);
    });
  });

  it('shows inline validation messages when text is too short', () => {
    const { getByTestId } = render(<ComposeScreen />);

    fireEvent.changeText(getByTestId('title-input'), 'hey');
    fireEvent.changeText(getByTestId('body-input'), 'short');

    expect(getByTestId('title-error').props.children).toContain('Title must be at least');
    expect(getByTestId('body-error').props.children).toContain('Content must be at least');
  });
});
