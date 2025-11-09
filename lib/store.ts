import * as SecureStore from 'expo-secure-store';

const KEYS = {
  RSA_PRIVATE_PEM: 'rsa_private_pem',
  USER_API_KEY: 'user_api_key',
  CLIENT_ID: 'client_id',
} as const;

/**
 * Save RSA private key to secure storage
 */
export async function savePrivateKey(privateKeyPem: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEYS.RSA_PRIVATE_PEM, privateKeyPem);
  } catch (error) {
    console.error('Failed to save private key:', error);
    throw new Error('Failed to securely store private key');
  }
}

/**
 * Load RSA private key from secure storage
 */
export async function loadPrivateKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.RSA_PRIVATE_PEM);
  } catch (error) {
    console.error('Failed to load private key:', error);
    return null;
  }
}

/**
 * Save User API Key to secure storage
 */
export async function saveUserApiKey(apiKey: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEYS.USER_API_KEY, apiKey);
  } catch (error) {
    console.error('Failed to save user API key:', error);
    throw new Error('Failed to securely store user API key');
  }
}

/**
 * Load User API Key from secure storage
 */
export async function loadUserApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.USER_API_KEY);
  } catch (error) {
    console.error('Failed to load user API key:', error);
    return null;
  }
}

/**
 * Save client ID to secure storage
 */
export async function saveClientId(clientId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEYS.CLIENT_ID, clientId);
  } catch (error) {
    console.error('Failed to save client ID:', error);
    throw new Error('Failed to securely store client ID');
  }
}

/**
 * Load client ID from secure storage
 */
export async function loadClientId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.CLIENT_ID);
  } catch (error) {
    console.error('Failed to load client ID:', error);
    return null;
  }
}

/**
 * Clear all stored authentication data
 */
export async function clearAll(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.RSA_PRIVATE_PEM),
      SecureStore.deleteItemAsync(KEYS.USER_API_KEY),
      SecureStore.deleteItemAsync(KEYS.CLIENT_ID),
    ]);
  } catch (error) {
    console.error('Failed to clear storage:', error);
    // Don't throw - best effort cleanup
  }
}
