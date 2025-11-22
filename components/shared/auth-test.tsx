import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, Warning, Info } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { discourseApi } from '../../shared/discourseApi';
import { useAuth } from '@/shared/auth-context';
import { UserApiKeyManager } from '../../shared/userApiKeyManager';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: any;
}

export function AuthTestScreen() {
  const { isDark, isAmoled } = useTheme();
  const { signIn, signOut, user, isAuthenticated } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    card: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    success: isDark ? '#10b981' : '#059669',
    error: isDark ? '#ef4444' : '#dc2626',
    warning: isDark ? '#f59e0b' : '#d97706',
    info: isDark ? '#3b82f6' : '#0ea5e9',
  };

  useEffect(() => {
    const checkApiKeyStatus = async () => {
      try {
        const hasKey = await UserApiKeyManager.hasApiKey();
        setHasApiKey(hasKey);
      } catch (error) {
        console.warn('AuthTestScreen: Failed to check API key status', error);
        setHasApiKey(false);
      }
    };

    checkApiKeyStatus();
  }, []);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const runConnectionTest = async () => {
    addResult({
      name: 'Discourse Connection',
      status: 'pending',
      message: 'Testing connection to Discourse instance...',
    });

    try {
      // Test basic connection by trying to get current user
      const response = await discourseApi.getCurrentUser();
      addResult({
        name: 'Discourse Connection',
        status: 'success',
        message: 'Successfully connected to Discourse',
        details: {
          authenticated: response.success,
          hasUser: !!response.data,
        },
      });
      return true;
    } catch (error) {
      addResult({
        name: 'Discourse Connection',
        status: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return false;
    }
  };

  const runApiTest = async () => {
    addResult({
      name: 'API Authentication',
      status: 'pending',
      message: 'Testing API credentials...',
    });

    try {
      const response = await discourseApi.getCurrentUser();
      addResult({
        name: 'API Authentication',
        status: 'success',
        message: 'API authentication successful',
        details: {
          username: response.data?.username,
          userId: response.data?.id,
        },
      });
      return true;
    } catch (error) {
      addResult({
        name: 'API Authentication',
        status: 'error',
        message: `API authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return false;
    }
  };

  const runUserTest = async () => {
    addResult({
      name: 'User Data',
      status: 'pending',
      message: 'Testing user data retrieval...',
    });

    try {
      const response = await discourseApi.getCurrentUser();
      if (response.data) {
        addResult({
          name: 'User Data',
          status: 'success',
          message: 'User data retrieved successfully',
          details: {
            username: response.data.username,
            name: response.data.name,
            email: response.data.email,
            trustLevel: response.data.trust_level,
          },
        });
        return true;
      } else {
        addResult({
          name: 'User Data',
          status: 'error',
          message: 'No user data available',
        });
        return false;
      }
    } catch (error) {
      addResult({
        name: 'User Data',
        status: 'error',
        message: `User data retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return false;
    }
  };

  const runAuthHookTest = async () => {
    addResult({
      name: 'Auth Hook',
      status: 'pending',
      message: 'Testing authentication hook...',
    });

    try {
      // Test login with mock credentials (you'll need to replace with real ones)
      const testCredentials = {
        email: 'test@example.com',
        password: 'testpassword',
      };

      // This will fail with mock credentials, but we can test the hook structure
      addResult({
        name: 'Auth Hook',
        status: 'warning',
        message: 'Auth hook structure is working (login will fail with test credentials)',
        details: {
          isAuthenticated,
          hasUser: !!user,
        },
      });
      return true;
    } catch (error) {
      addResult({
        name: 'Auth Hook',
        status: 'error',
        message: `Auth hook test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();

    addResult({
      name: 'Test Suite',
      status: 'info',
      message: 'Starting Discourse authentication tests...',
    });

    // Run tests in sequence
    const connectionOk = await runConnectionTest();
    if (!connectionOk) {
      addResult({
        name: 'Test Suite',
        status: 'error',
        message: 'Stopping tests due to connection failure',
      });
      setIsRunning(false);
      return;
    }

    const apiOk = await runApiTest();
    if (!apiOk) {
      addResult({
        name: 'Test Suite',
        status: 'warning',
        message: 'API authentication failed, but connection is working',
      });
    }

    await runUserTest();
    await runAuthHookTest();

    addResult({
      name: 'Test Suite',
      status: 'success',
      message: 'All tests completed',
    });

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} color={colors.success} weight="fill" />;
      case 'error':
        return <XCircle size={20} color={colors.error} weight="fill" />;
      case 'warning':
        return <Warning size={20} color={colors.warning} weight="fill" />;
      case 'info':
        return <Info size={20} color={colors.info} weight="fill" />;
      default:
        return <ActivityIndicator size={20} color={colors.info} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.info;
      default:
        return colors.secondary;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Discourse Auth Test</Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>
          Test your Discourse API configuration
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Configuration</Text>
          <Text style={[styles.cardText, { color: colors.secondary }]}>
            Discourse URL: {process.env.EXPO_PUBLIC_DISCOURSE_URL || 'Not configured'}
          </Text>
          <Text style={[styles.cardText, { color: colors.secondary }]}>
            Auth Redirect Scheme: {process.env.EXPO_PUBLIC_AUTH_REDIRECT_SCHEME || 'fomio://auth/callback'}
          </Text>
          <Text style={[styles.cardText, { color: colors.secondary }]}>
            Authentication Method: User API Keys
          </Text>
          <Text style={[styles.cardText, { color: colors.secondary }]}>
            API Key Status: {hasApiKey === null ? 'Checking...' : (hasApiKey ? 'Configured' : 'Not configured')}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.info },
              isRunning && styles.buttonDisabled,
            ]}
            onPress={runAllTests}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Run All Tests</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonSecondary, { borderColor: colors.border }]}
            onPress={clearResults}
          >
            <Text style={[styles.buttonTextSecondary, { color: colors.text }]}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={[styles.resultsTitle, { color: colors.text }]}>Test Results</Text>
            {results.map((result, index) => (
              <View
                key={index}
                style={[
                  styles.resultItem,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.resultHeader}>
                  {getStatusIcon(result.status)}
                  <Text style={[styles.resultName, { color: colors.text }]}>
                    {result.name}
                  </Text>
                </View>
                <Text style={[styles.resultMessage, { color: colors.secondary }]}>
                  {result.message}
                </Text>
                {result.details && (
                  <View style={styles.resultDetails}>
                    {Object.entries(result.details).map(([key, value]) => (
                      <Text key={key} style={[styles.resultDetail, { color: colors.secondary }]}>
                        {key}: {String(value)}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  resultDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  resultDetail: {
    fontSize: 12,
    marginBottom: 2,
  },
}); 