import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { logger } from './logger';
import { generateRsaKeypair, decryptPayloadBase64ToUtf8 } from '../lib/crypto';

// Lazy-load react-native-quick-crypto for React Native RSA support
// We load it lazily because it may not be available at module load time
let QuickCrypto: any = null;
let QuickCryptoLoadAttempted = false;

function loadQuickCrypto(): any {
  if (QuickCryptoLoadAttempted) {
    return QuickCrypto;
  }
  
  QuickCryptoLoadAttempted = true;
  
  // Check if we're in Expo Go (where react-native-quick-crypto is not supported)
  // Expo Go doesn't support native modules, so we skip loading react-native-quick-crypto
  // Check multiple ways to detect Expo Go
  const isExpoGo = 
    Constants.executionEnvironment === 'storeClient' ||
    (typeof Constants.expoConfig !== 'undefined' && Constants.expoConfig?.isDetached !== true) ||
    (typeof global !== 'undefined' && (global as any).__expo !== undefined) ||
    (typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative' && 
     typeof (global as any).__expo !== 'undefined');
  
  if (isExpoGo) {
    logger.info('UserApiKeyManager: Detected Expo Go environment, skipping react-native-quick-crypto, will use node-forge fallback');
    QuickCrypto = null;
    return null;
  }
  
  try {
    // Try to load react-native-quick-crypto
    // In React Native/Expo, we should always try to load it
    // Note: This requires native code and may not be available in Expo Go
    // We'll gracefully fall back to node-forge if it's not available
    let cryptoModule: any;
    
    try {
      // Use a dynamic import-like approach with require wrapped in try-catch
      cryptoModule = require('react-native-quick-crypto');
    } catch (requireError: any) {
      // Handle the "undefined" module error specifically
      const requireErrorMsg = requireError?.message || String(requireError);
      if (requireErrorMsg.includes('undefined') || 
          requireErrorMsg.includes('Cannot find module') || 
          requireErrorMsg.includes('Module not found') ||
          requireErrorMsg.includes('not supported in Expo Go') ||
          requireErrorMsg.includes('Expo Go')) {
        // Module not available - this is fine, we'll use fallbacks
        // Don't log this as an error since it's expected in Expo Go
        QuickCrypto = null;
        return null;
      }
      throw requireError; // Re-throw if it's a different error
    }
    
    // Check if module is undefined or null
    if (!cryptoModule || cryptoModule === undefined) {
      QuickCrypto = null;
      return null;
    }
    
    // Check if it has the webcrypto API we need
    if (cryptoModule && cryptoModule.webcrypto && cryptoModule.webcrypto.subtle) {
      QuickCrypto = cryptoModule;
      logger.info('UserApiKeyManager: react-native-quick-crypto loaded successfully');
    } else if (cryptoModule && cryptoModule.default && cryptoModule.default.webcrypto) {
      // Try default export
      QuickCrypto = cryptoModule.default;
      logger.info('UserApiKeyManager: react-native-quick-crypto loaded successfully (default export)');
    } else if (cryptoModule && typeof cryptoModule === 'object') {
      // Try accessing webcrypto directly
      QuickCrypto = cryptoModule;
      logger.info('UserApiKeyManager: react-native-quick-crypto module loaded, checking webcrypto API');
    } else {
      logger.warn('UserApiKeyManager: react-native-quick-crypto loaded but structure unexpected');
      QuickCrypto = null;
    }
  } catch (error: any) {
    // Library not available - this is expected in web environments or Expo Go
    // In React Native, this might indicate the library isn't properly installed
    const errorMessage = error?.message || String(error);
    // Only log if it's not a "module not found" type error
    if (!errorMessage.includes('Cannot find module') && 
        !errorMessage.includes('Module not found') && 
        !errorMessage.includes('undefined') &&
        !errorMessage.includes('not supported in Expo Go')) {
      logger.warn('UserApiKeyManager: Failed to load react-native-quick-crypto', {
        error: errorMessage,
        code: error?.code,
      });
    }
    QuickCrypto = null;
  }
  
  return QuickCrypto;
}

const PRIVATE_KEY_STORAGE_KEY = 'fomio_user_api_private_key';
const PUBLIC_KEY_STORAGE_KEY = 'fomio_user_api_public_key';
const API_KEY_STORAGE_KEY = 'fomio_user_api_key';
const CLIENT_ID_STORAGE_KEY = 'fomio_user_api_client_id';
const ONE_TIME_PASSWORD_STORAGE_KEY = 'fomio_user_api_otp';
const NONCE_STORAGE_KEY = 'fomio_user_api_nonce';

export interface UserApiKeyData {
  key: string;
  clientId: string;
  oneTimePassword?: string;
  createdAt: number;
}

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

/**
 * User API Key Manager
 * Handles RSA key pair generation, API key storage, and encrypted payload decryption
 * Following Discourse User API Keys specification
 */
export class UserApiKeyManager {
  /**
   * Generate RSA key pair for User API Key authentication
   * Uses RSA-OAEP with SHA-256 for encryption
   * Automatically stores both keys securely
   * @returns Key pair with private and public keys
   */
  static async generateKeyPair(): Promise<KeyPair> {
    try {
      logger.info('UserApiKeyManager: Generating RSA key pair...');
      
      // Generate RSA key pair using expo-crypto
      // Note: expo-crypto doesn't have direct RSA key generation
      // We'll use Web Crypto API if available, otherwise use a polyfill
      const keyPair = await this.generateRSAKeyPair();
      
      // Store both keys securely
      await this.storePrivateKey(keyPair.privateKey);
      await this.storePublicKey(keyPair.publicKey);
      
      logger.info('UserApiKeyManager: RSA key pair generated and stored successfully');
      return keyPair;
    } catch (error) {
      logger.error('UserApiKeyManager: Failed to generate key pair', error);
      throw new Error('Failed to generate RSA key pair for API authentication');
    }
  }

  /**
   * Generate RSA key pair using available crypto APIs
   * Uses react-native-quick-crypto for React Native, Web Crypto API for web
   */
  private static async generateRSAKeyPair(): Promise<KeyPair> {
    // Try to load react-native-quick-crypto if not already loaded
    const quickCrypto = loadQuickCrypto();
    
    // Try react-native-quick-crypto first (React Native)
    if (quickCrypto && quickCrypto.webcrypto && quickCrypto.webcrypto.subtle) {
      try {
        logger.info('UserApiKeyManager: Attempting RSA key generation with react-native-quick-crypto');
        const keyPair = await quickCrypto.webcrypto.subtle.generateKey(
          {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
          },
          true,
          ['encrypt', 'decrypt']
        );

        const privateKey = await quickCrypto.webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey);
        const publicKey = await quickCrypto.webcrypto.subtle.exportKey('spki', keyPair.publicKey);

        logger.info('UserApiKeyManager: RSA key pair generated successfully with react-native-quick-crypto');
        return {
          privateKey: this.arrayBufferToBase64(privateKey),
          publicKey: this.arrayBufferToBase64(publicKey),
        };
      } catch (error: any) {
        logger.error('UserApiKeyManager: QuickCrypto RSA generation failed', {
          error: error?.message || String(error),
          stack: error?.stack,
        });
        logger.warn('UserApiKeyManager: QuickCrypto failed, trying Web Crypto API');
      }
    } else {
      logger.warn('UserApiKeyManager: QuickCrypto not available', {
        hasQuickCrypto: !!quickCrypto,
        hasWebcrypto: !!(quickCrypto?.webcrypto),
        hasSubtle: !!(quickCrypto?.webcrypto?.subtle),
      });
    }

    // Try Web Crypto API (web environment or polyfills)
    const webCrypto = typeof window !== 'undefined' && window.crypto 
      ? window.crypto 
      : typeof global !== 'undefined' && (global as any).crypto 
        ? (global as any).crypto 
        : null;
    
    if (webCrypto && webCrypto.subtle) {
      try {
        logger.info('UserApiKeyManager: Attempting RSA key generation with Web Crypto API');
        const keyPair = await webCrypto.subtle.generateKey(
          {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
          },
          true,
          ['encrypt', 'decrypt']
        );

        const privateKey = await webCrypto.subtle.exportKey('pkcs8', keyPair.privateKey);
        const publicKey = await webCrypto.subtle.exportKey('spki', keyPair.publicKey);

        logger.info('UserApiKeyManager: RSA key pair generated successfully with Web Crypto API');
        return {
          privateKey: this.arrayBufferToBase64(privateKey),
          publicKey: this.arrayBufferToBase64(publicKey),
        };
      } catch (error: any) {
        logger.error('UserApiKeyManager: Web Crypto API failed', {
          error: error?.message || String(error),
          stack: error?.stack,
        });
      }
    }
    
    // Fallback: Use node-forge for RSA key generation
    // This works in React Native environments where Web Crypto API isn't available
    try {
      logger.info('UserApiKeyManager: Attempting RSA key generation with node-forge');
      const keyPair = generateRsaKeypair(2048);
      
      // Convert PEM to base64 format for consistency with Web Crypto API format
      // The PEM format from node-forge is already correct for Discourse API
      logger.info('UserApiKeyManager: RSA key pair generated successfully with node-forge');
      return {
        privateKey: keyPair.privateKeyPem,
        publicKey: keyPair.publicKeyPem,
      };
    } catch (error: any) {
      logger.error('UserApiKeyManager: node-forge RSA generation failed', {
        error: error?.message || String(error),
        stack: error?.stack,
      });
      
      // If all methods fail, throw an error
      throw new Error(
        'RSA key generation failed: No crypto API available. ' +
        'Please ensure react-native-quick-crypto is properly installed or node-forge is available. ' +
        'If using Expo, try: npx expo prebuild --clean'
      );
    }
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Store private key securely
   * @param privateKey - RSA private key in base64 format
   */
  static async storePrivateKey(privateKey: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, privateKey);
      logger.info('UserApiKeyManager: Private key stored securely');
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to store private key', error);
      throw new Error('Failed to store private key securely');
    }
  }

  /**
   * Store public key securely
   * @param publicKey - RSA public key in base64 format
   */
  static async storePublicKey(publicKey: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(PUBLIC_KEY_STORAGE_KEY, publicKey);
      logger.info('UserApiKeyManager: Public key stored securely');
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to store public key', error);
      throw new Error('Failed to store public key securely');
    }
  }

  /**
   * Get stored public key
   * @returns Public key or null if not found
   */
  static async getPublicKey(): Promise<string | null> {
    try {
      const publicKey = await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY);
      return publicKey;
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to get public key', error);
      return null;
    }
  }

  /**
   * Extract public key from private key
   * Note: Web Crypto API doesn't support extracting public key from private key directly.
   * This method will throw an error - if you have a private key but no public key,
   * you should generate a new key pair instead.
   * @param privateKey - RSA private key in base64 format
   * @returns Public key in base64 format
   * @throws Error indicating that extraction is not supported
   */
  static async extractPublicKeyFromPrivate(privateKey: string): Promise<string> {
    // Web Crypto API doesn't support extracting public key from private key
    // If we have a private key but no public key, we should generate a new key pair
    logger.warn('UserApiKeyManager: Cannot extract public key from private key - Web Crypto API limitation');
    throw new Error('Public key extraction from private key is not supported. Please generate a new key pair.');
  }

  /**
   * Generate a random nonce for API key authorization
   * @returns Nonce string (32 random bytes encoded as base64)
   */
  static async generateNonce(): Promise<string> {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const nonce = this.arrayBufferToBase64(randomBytes);
      logger.info('UserApiKeyManager: Nonce generated');
      return nonce;
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to generate nonce', error);
      throw new Error('Failed to generate nonce');
    }
  }

  /**
   * Store nonce securely
   * @param nonce - Nonce string
   */
  static async storeNonce(nonce: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(NONCE_STORAGE_KEY, nonce);
      logger.info('UserApiKeyManager: Nonce stored securely');
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to store nonce', error);
      throw new Error('Failed to store nonce securely');
    }
  }

  /**
   * Get stored nonce
   * @returns Nonce or null if not found
   */
  static async getNonce(): Promise<string | null> {
    try {
      const nonce = await SecureStore.getItemAsync(NONCE_STORAGE_KEY);
      return nonce;
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to get nonce', error);
      return null;
    }
  }

  /**
   * Get stored private key
   * @returns Private key or null if not found
   */
  static async getPrivateKey(): Promise<string | null> {
    try {
      const privateKey = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
      return privateKey;
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to get private key', error);
      return null;
    }
  }

  /**
   * Store API key data securely
   * @param apiKeyData - API key data to store
   */
  static async storeApiKey(apiKeyData: UserApiKeyData): Promise<void> {
    try {
      await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, JSON.stringify(apiKeyData));
      logger.info('UserApiKeyManager: API key stored securely');
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to store API key', error);
      throw new Error('Failed to store API key securely');
    }
  }

  /**
   * Get stored API key
   * @returns API key data or null if not found
   */
  static async getApiKey(): Promise<UserApiKeyData | null> {
    try {
      const apiKeyData = await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
      if (!apiKeyData) {
        return null;
      }
      return JSON.parse(apiKeyData) as UserApiKeyData;
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to get API key', error);
      return null;
    }
  }

  /**
   * Check if user has an API key stored
   * @returns true if API key exists
   */
  static async hasApiKey(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    return apiKey !== null && !!apiKey.key;
  }

  /**
   * Generate or get existing client ID
   * @returns Client ID string
   */
  static async getOrGenerateClientId(): Promise<string> {
    try {
      let clientId = await SecureStore.getItemAsync(CLIENT_ID_STORAGE_KEY);
      
      if (!clientId) {
        // Generate new client ID (UUID v4)
        const randomBytes = await Crypto.getRandomBytesAsync(16);
        const uuid = this.generateUUID(randomBytes);
        clientId = uuid;
        await SecureStore.setItemAsync(CLIENT_ID_STORAGE_KEY, clientId);
        logger.info('UserApiKeyManager: Generated new client ID');
      }
      
      return clientId;
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to get/generate client ID', error);
      // Fallback to timestamp-based ID
      return `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
  }

  /**
   * Generate UUID v4 from random bytes
   */
  private static generateUUID(randomBytes: Uint8Array): string {
    // Set version (4) and variant bits
    randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40; // Version 4
    randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80; // Variant 10

    const hex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  }

  /**
   * Decrypt encrypted payload from Discourse
   * @param encryptedPayload - Base64 encoded encrypted payload
   * @returns Decrypted payload containing API key and optional one-time password
   */
  static async decryptPayload(encryptedPayload: string): Promise<{ key: string; one_time_password?: string }> {
    try {
      logger.info('UserApiKeyManager: Decrypting payload...');
      
      const privateKey = await this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Cannot decrypt payload.');
      }

      // Decode base64 payload
      const encryptedData = this.base64ToArrayBuffer(encryptedPayload);

      // Try react-native-quick-crypto first (React Native)
      const quickCrypto = loadQuickCrypto();
      if (quickCrypto && quickCrypto.webcrypto && quickCrypto.webcrypto.subtle) {
        try {
          logger.info('UserApiKeyManager: Attempting decryption with react-native-quick-crypto');
          const keyData = this.base64ToArrayBuffer(privateKey);
          const cryptoKey = await quickCrypto.webcrypto.subtle.importKey(
            'pkcs8',
            keyData,
            {
              name: 'RSA-OAEP',
              hash: 'SHA-256',
            },
            false,
            ['decrypt']
          );

          const decrypted = await quickCrypto.webcrypto.subtle.decrypt(
            {
              name: 'RSA-OAEP',
            },
            cryptoKey,
            encryptedData
          );

          const decryptedText = new TextDecoder().decode(decrypted);
          const payload = JSON.parse(decryptedText);
          
          logger.info('UserApiKeyManager: Payload decrypted successfully using QuickCrypto');
          return payload;
        } catch (cryptoError: any) {
          logger.error('UserApiKeyManager: QuickCrypto decryption failed, trying Web Crypto API', {
            error: cryptoError?.message || String(cryptoError),
            stack: cryptoError?.stack,
          });
        }
      }

      // Try Web Crypto API (web environment or polyfills)
      const webCrypto = typeof window !== 'undefined' && window.crypto 
        ? window.crypto 
        : typeof global !== 'undefined' && (global as any).crypto 
          ? (global as any).crypto 
          : null;

      if (webCrypto && webCrypto.subtle) {
        try {
          logger.info('UserApiKeyManager: Attempting decryption with Web Crypto API');
          const keyData = this.base64ToArrayBuffer(privateKey);
          const cryptoKey = await webCrypto.subtle.importKey(
            'pkcs8',
            keyData,
            {
              name: 'RSA-OAEP',
              hash: 'SHA-256',
            },
            false,
            ['decrypt']
          );

          const decrypted = await webCrypto.subtle.decrypt(
            {
              name: 'RSA-OAEP',
            },
            cryptoKey,
            encryptedData
          );

          const decryptedText = new TextDecoder().decode(decrypted);
          const payload = JSON.parse(decryptedText);
          
          logger.info('UserApiKeyManager: Payload decrypted successfully using Web Crypto API');
          return payload;
        } catch (cryptoError: any) {
          logger.error('UserApiKeyManager: Web Crypto API decryption failed', {
            error: cryptoError?.message || String(cryptoError),
            stack: cryptoError?.stack,
          });
          // Fall through to node-forge fallback
        }
      }
      
      // Fallback: Use node-forge for RSA decryption
      // This works in React Native environments where Web Crypto API isn't available
      try {
        logger.info('UserApiKeyManager: Attempting decryption with node-forge');
        const decryptedText = decryptPayloadBase64ToUtf8(encryptedPayload, privateKey);
        const payload = JSON.parse(decryptedText);
        
        logger.info('UserApiKeyManager: Payload decrypted successfully using node-forge');
        return payload;
      } catch (forgeError: any) {
        logger.error('UserApiKeyManager: node-forge decryption failed', {
          error: forgeError?.message || String(forgeError),
          stack: forgeError?.stack,
        });
        throw new Error('RSA decryption failed: No crypto API available. Please ensure react-native-quick-crypto is installed or node-forge is available.');
      }
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to decrypt payload', error);
      throw new Error(`Failed to decrypt API key payload: ${error.message || 'Unknown error'}. Please try authorizing again.`);
    }
  }

  /**
   * Clear all stored API key data
   */
  static async clearApiKey(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
      await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
      await SecureStore.deleteItemAsync(PUBLIC_KEY_STORAGE_KEY);
      await SecureStore.deleteItemAsync(ONE_TIME_PASSWORD_STORAGE_KEY);
      await SecureStore.deleteItemAsync(NONCE_STORAGE_KEY);
      // Keep client ID for potential reuse
      logger.info('UserApiKeyManager: API key data cleared');
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to clear API key', error);
      // Don't throw - allow cleanup to continue
    }
  }

  /**
   * Clear client ID (forces new ID on next generation)
   */
  static async clearClientId(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(CLIENT_ID_STORAGE_KEY);
      logger.info('UserApiKeyManager: Client ID cleared');
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to clear client ID', error);
    }
  }

  /**
   * Store one-time password if provided
   * @param otp - One-time password string
   */
  static async storeOneTimePassword(otp: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(ONE_TIME_PASSWORD_STORAGE_KEY, otp);
      logger.info('UserApiKeyManager: One-time password stored');
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to store one-time password', error);
    }
  }

  /**
   * Get stored one-time password
   * @returns One-time password or null
   */
  static async getOneTimePassword(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ONE_TIME_PASSWORD_STORAGE_KEY);
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to get one-time password', error);
      return null;
    }
  }
}

export default UserApiKeyManager;

