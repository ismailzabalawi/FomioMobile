import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
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
  
  // Try to load react-native-quick-crypto first
  // In development builds and production, this should work
  // Only fall back if the module actually fails to load
  try {
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
        logger.info('UserApiKeyManager: react-native-quick-crypto not available, will use node-forge fallback');
        QuickCrypto = null;
        return null;
      }
      throw requireError; // Re-throw if it's a different error
    }
    
    // Check if module is undefined or null
    if (!cryptoModule || cryptoModule === undefined) {
      logger.info('UserApiKeyManager: react-native-quick-crypto module is undefined, will use node-forge fallback');
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
      logger.warn('UserApiKeyManager: react-native-quick-crypto loaded but structure unexpected, will use node-forge fallback');
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
const API_KEY_STORAGE_KEY = 'fomio_user_api_key_data'; // JSON data storage (separate from raw key)
const CLIENT_ID_STORAGE_KEY = 'fomio_user_api_client_id';
const ONE_TIME_PASSWORD_STORAGE_KEY = 'fomio_user_api_otp';
const NONCE_STORAGE_KEY = 'fomio_user_api_nonce';

// Unified storage keys for lib/auth.ts compatibility
const FOMIO_USER_API_KEY = 'fomio_user_api_key'; // Raw key storage (must be separate from JSON)
const FOMIO_USER_API_USERNAME = 'fomio_user_api_username';
// Legacy keys for backward compatibility
const LEGACY_API_KEY = 'disc_user_api_key';
const LEGACY_CLIENT_ID = 'disc_client_id';

export interface UserApiKeyData {
  key: string;
  clientId: string;
  oneTimePassword?: string;
  createdAt: number;
  username?: string; // Store username for Api-Username header
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
// Memory cache for API key to handle Android SecureStore timing issues
// This ensures the key is immediately available even if SecureStore hasn't flushed yet
let memoryKeyCache: { key: string; username?: string; clientId?: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
        const privateKeyBase64 = this.arrayBufferToBase64(privateKey);
        const publicKeyBase64 = this.arrayBufferToBase64(publicKey);
        return {
          privateKey: this.base64DerToPem(privateKeyBase64, 'PRIVATE'),
          publicKey: this.base64DerToPem(publicKeyBase64, 'PUBLIC'),
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
        const privateKeyBase64 = this.arrayBufferToBase64(privateKey);
        const publicKeyBase64 = this.arrayBufferToBase64(publicKey);
        return {
          privateKey: this.base64DerToPem(privateKeyBase64, 'PRIVATE'),
          publicKey: this.base64DerToPem(publicKeyBase64, 'PUBLIC'),
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
   * Convert Base64 DER format to PEM format
   * Discourse API requires PEM format for public keys
   * @param base64 - Base64-encoded DER key
   * @param keyType - 'PUBLIC' or 'PRIVATE'
   * @returns PEM-formatted key string
   */
  private static base64DerToPem(base64: string, keyType: 'PUBLIC' | 'PRIVATE' = 'PUBLIC'): string {
    // Split base64 into 64-character lines (PEM format standard)
    const lines: string[] = [];
    for (let i = 0; i < base64.length; i += 64) {
      lines.push(base64.substring(i, i + 64));
    }
    
    const header = keyType === 'PUBLIC' ? '-----BEGIN PUBLIC KEY-----' : '-----BEGIN PRIVATE KEY-----';
    const footer = keyType === 'PUBLIC' ? '-----END PUBLIC KEY-----' : '-----END PRIVATE KEY-----';
    
    return `${header}\n${lines.join('\n')}\n${footer}`;
  }

  /**
   * Convert PEM format to Base64 DER format
   * Web Crypto API requires DER format (base64 without headers)
   * @param pem - PEM-formatted key string
   * @returns Base64-encoded DER key (without headers)
   */
  private static pemToBase64Der(pem: string): string {
    // Remove PEM headers and newlines, extract just the base64 content
    return pem
      .replace(/-----BEGIN (PUBLIC|PRIVATE) KEY-----/g, '')
      .replace(/-----END (PUBLIC|PRIVATE) KEY-----/g, '')
      .replace(/\s/g, '') // Remove all whitespace including newlines
      .trim();
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
   * Clear stored nonce (after successful auth)
   */
  static async clearNonce(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(NONCE_STORAGE_KEY);
      logger.info('UserApiKeyManager: Nonce cleared');
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to clear nonce', error);
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
        return null; // Key doesn't exist - this is expected, not an error
      }
      return JSON.parse(apiKeyData) as UserApiKeyData;
    } catch (error: any) {
      // Only log actual errors (storage failures, parse errors), not null/undefined
      // On iOS simulator, SecureStore can fail with null errors due to storage directory issues
      // CRITICAL: Don't call logger.error for SecureStore null errors - they cause React Native LogBox to show "ERROR null"
      if (error && error !== null && error !== undefined) {
        const errorMessage = error?.message || String(error);
        // Only log if it's a real error, not just a null value
        // Also check if error object itself stringifies to null
        if (errorMessage && 
            errorMessage !== 'null' && 
            errorMessage !== 'undefined' &&
            String(error) !== 'null' &&
            String(error) !== 'undefined') {
          // Final check: ensure error object doesn't stringify to null
          try {
            const errorStringify = JSON.stringify(error);
            if (errorStringify && errorStringify !== 'null' && errorStringify !== null) {
              logger.error('UserApiKeyManager: Failed to get API key', error);
            }
            // If stringify is null, silently skip logging (expected SecureStore behavior)
          } catch {
            // If stringify fails, skip logging to avoid React Native LogBox issues
          }
        }
      }
      // Return null for any error (expected or unexpected) - caller should handle gracefully
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
   * @returns Decrypted payload containing API key, optional one-time password, and optional nonce
   */
  static async decryptPayload(encryptedPayload: string): Promise<{ key: string; one_time_password?: string; nonce?: string }> {
    try {
      logger.info('UserApiKeyManager: Decrypting payload...');

      const privateKey = await this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Cannot decrypt payload.');
      }

      const normalizedPayload = this.normalizeBase64Payload(encryptedPayload);

      // Decode base64 payload
      const encryptedData = this.base64ToArrayBuffer(normalizedPayload);

      // Try react-native-quick-crypto first (React Native)
      const quickCrypto = loadQuickCrypto();
      if (quickCrypto && quickCrypto.webcrypto && quickCrypto.webcrypto.subtle) {
        try {
          logger.info('UserApiKeyManager: Attempting decryption with react-native-quick-crypto');
          // Convert PEM to base64 DER if needed
          const privateKeyDer = privateKey.includes('-----BEGIN') 
            ? this.pemToBase64Der(privateKey) 
            : privateKey;
          const keyData = this.base64ToArrayBuffer(privateKeyDer);
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
          // Use warn instead of error since this is an expected fallback path
          logger.warn('UserApiKeyManager: QuickCrypto decryption failed, trying fallback', {
            error: cryptoError?.message || (cryptoError === null ? 'null' : String(cryptoError)),
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
          // Convert PEM to base64 DER if needed
          const privateKeyDer = privateKey.includes('-----BEGIN') 
            ? this.pemToBase64Der(privateKey) 
            : privateKey;
          const keyData = this.base64ToArrayBuffer(privateKeyDer);
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
          // Use warn instead of error since this is an expected fallback path
          logger.warn('UserApiKeyManager: Web Crypto API decryption failed, trying node-forge', {
            error: cryptoError?.message || (cryptoError === null ? 'null' : String(cryptoError)),
          });
          // Fall through to node-forge fallback
        }
      }
      
      // Fallback: Use node-forge for RSA decryption
      // This works in React Native environments where Web Crypto API isn't available
      try {
        logger.info('UserApiKeyManager: Attempting decryption with node-forge');
        const decryptedText = decryptPayloadBase64ToUtf8(normalizedPayload, privateKey);
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
      // Handle null errors gracefully - crypto libraries sometimes throw null
      const errorMessage = error?.message || (error === null ? 'Null error from crypto' : String(error) || 'Unknown error');
      logger.error('UserApiKeyManager: Failed to decrypt payload', {
        errorMessage,
        errorType: error === null ? 'null' : typeof error,
      });
      throw new Error(`Failed to decrypt API key payload: ${errorMessage}. Please try authorizing again.`);
    }
  }

  /**
   * Normalize base64 payloads from URL params (handles +, -, _, and padding).
   */
  private static normalizeBase64Payload(input: string): string {
    let normalized = String(input || '').trim();
    if (!normalized) {
      return normalized;
    }
    
    // First, URL-decode if needed (in case it wasn't decoded upstream)
    if (normalized.includes('%')) {
      try {
        normalized = decodeURIComponent(normalized);
      } catch {
        // If decoding fails, continue with original
      }
    }
    
    // Remove all whitespace including newlines, carriage returns, tabs, and spaces
    normalized = normalized.replace(/\s/g, '');
    
    // Convert URL-safe base64 to standard base64
    normalized = normalized.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    const remainder = normalized.length % 4;
    if (remainder) {
      normalized = normalized.padEnd(normalized.length + (4 - remainder), '=');
    }
    
    logger.debug('UserApiKeyManager: Normalized base64 payload', {
      originalLength: input?.length,
      normalizedLength: normalized.length,
      first50: normalized.substring(0, 50),
    });
    
    return normalized;
  }

  /**
   * Set memory cache immediately (for temporary key storage scenarios)
   * This ensures the key is available even before SecureStore flushes
   * @param key - The API key string
   * @param username - Username (optional)
   * @param clientId - Client ID (optional)
   */
  static setMemoryCache(key: string, username?: string, clientId?: string): void {
    memoryKeyCache = {
      key,
      username,
      clientId,
      timestamp: Date.now(),
    };
    logger.info('🔍 DEBUG: Memory cache SET via setMemoryCache', {
      hasKey: !!key,
      keyLength: key.length,
      hasUsername: !!username,
      timestamp: memoryKeyCache.timestamp,
    });
    // #region agent log
    const logDataSetCache = {location:'userApiKeyManager.ts:745',message:'setMemoryCache CALLED',data:{hasKey:!!key,keyLength:key.length,hasUsername:!!username,hasClientId:!!clientId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
    console.log('🔍 DEBUG:', JSON.stringify(logDataSetCache));
    fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataSetCache)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
    // #endregion
  }

  /**
   * Store complete auth credentials atomically to all required storage locations.
   * This is the single source of truth for storing auth data.
   * 
   * @param key - The API key string
   * @param username - Username for Api-Username header (optional but recommended)
   * @param clientId - Client ID for the app instance
   * @param otp - One-time password for cookie warming (optional)
   */
  static async storeCompleteAuth(
    key: string,
    username?: string,
    clientId?: string,
    otp?: string
  ): Promise<void> {
    // #region agent log
    const logData1 = {location:'userApiKeyManager.ts:742',message:'storeCompleteAuth ENTRY',data:{keyLength:key?.length||0,hasUsername:!!username,hasClientId:!!clientId,hasOtp:!!otp},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'};
    console.log('🔍 DEBUG:', JSON.stringify(logData1));
    fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData1)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
    // #endregion
    try {
      const resolvedClientId = clientId || await this.getOrGenerateClientId();
      
      // 1. Store complete JSON data first (for UserApiKeyManager consumers)
      const apiKeyData: UserApiKeyData = {
        key,
        clientId: resolvedClientId,
        oneTimePassword: otp,
        createdAt: Date.now(),
        username,
      };
      await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, JSON.stringify(apiKeyData));
      
      // 2. Store username if provided
      if (username) {
        await SecureStore.setItemAsync(FOMIO_USER_API_USERNAME, username);
      }
      
      // 3. Store raw API key LAST (for direct access by authHeaders)
      // This ensures the raw key is the final value and won't be overwritten
      // #region agent log
      const logData2 = {location:'userApiKeyManager.ts:768',message:'BEFORE storing raw key',data:{keyLength:key.length,storageKey:'FOMIO_USER_API_KEY'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'};
      console.log('🔍 DEBUG:', JSON.stringify(logData2));
      fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData2)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
      // #endregion
      await SecureStore.setItemAsync(FOMIO_USER_API_KEY, key);
      
      // CRITICAL FIX: Update memory cache immediately (handles Android SecureStore timing)
      // Update existing cache if it exists, or create new one
      // This ensures username is added to cache if it was set after initial cache creation
      if (memoryKeyCache && memoryKeyCache.key === key) {
        // Update existing cache with username if it wasn't set before
        memoryKeyCache.username = username || memoryKeyCache.username;
        memoryKeyCache.clientId = resolvedClientId;
        memoryKeyCache.timestamp = Date.now();
      } else {
        // Create new cache entry
        memoryKeyCache = {
          key,
          username,
          clientId: resolvedClientId,
          timestamp: Date.now(),
        };
      }
      logger.info('🔍 DEBUG: Memory cache SET/UPDATED in storeCompleteAuth', {
        hasKey: !!key,
        keyLength: key.length,
        hasUsername: !!username,
        timestamp: memoryKeyCache.timestamp,
      });
      // #region agent log
      const logDataCacheSet = {location:'userApiKeyManager.ts:786',message:'MEMORY CACHE SET',data:{hasKey:!!key,keyLength:key.length,hasUsername:!!username},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
      console.log('🔍 DEBUG:', JSON.stringify(logDataCacheSet));
      fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataCacheSet)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
      // #endregion
      // #region agent log
      const logData3 = {location:'userApiKeyManager.ts:770',message:'AFTER storing raw key',data:{keyLength:key.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
      console.log('🔍 DEBUG:', JSON.stringify(logData3));
      fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData3)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
      // #endregion
      
      // 4. Store legacy keys for backward compatibility
      await SecureStore.setItemAsync(LEGACY_API_KEY, key);
      await SecureStore.setItemAsync(LEGACY_CLIENT_ID, resolvedClientId);
      
      // 5. Store OTP separately if provided
      if (otp) {
        await SecureStore.setItemAsync(ONE_TIME_PASSWORD_STORAGE_KEY, otp);
      }
      
      // CRITICAL: Verify the raw key was stored (Android SecureStore may need a moment)
      // Small delay to ensure SecureStore has flushed
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify the key is readable
      const verifyKey = await SecureStore.getItemAsync(FOMIO_USER_API_KEY);
      // #region agent log
      const logData4 = {location:'userApiKeyManager.ts:784',message:'VERIFICATION check',data:{expectedLength:key.length,actualLength:verifyKey?.length||0,matches:verifyKey===key,hasValue:!!verifyKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D'};
      console.log('🔍 DEBUG:', JSON.stringify(logData4));
      fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData4)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
      // #endregion
      if (verifyKey !== key) {
        logger.warn('UserApiKeyManager: Key verification failed, retrying storage...', {
          expectedLength: key.length,
          actualLength: verifyKey?.length || 0,
        });
        // Retry storing the raw key
        await SecureStore.setItemAsync(FOMIO_USER_API_KEY, key);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Verify again after retry
        const retryVerifyKey = await SecureStore.getItemAsync(FOMIO_USER_API_KEY);
        if (retryVerifyKey !== key) {
          logger.error('UserApiKeyManager: Key verification failed after retry', {
            expectedLength: key.length,
            actualLength: retryVerifyKey?.length || 0,
          });
        }
      }
      
      logger.info('UserApiKeyManager: Complete auth credentials stored', {
        hasUsername: !!username,
        hasOtp: !!otp,
        verified: verifyKey === key,
      });
    } catch (error: any) {
      logger.error('UserApiKeyManager: Failed to store complete auth', error);
      throw new Error('Failed to store authentication credentials securely');
    }
  }

  /**
   * Get auth credentials for API requests.
   * This is the single source of truth for reading auth data.
   * 
   * @returns Object with key and optional username/clientId, or null if not authenticated
   */
  static async getAuthCredentials(): Promise<{ key: string; username?: string; clientId?: string } | null> {
    // #region agent log
    const logData5 = {location:'userApiKeyManager.ts:821',message:'getAuthCredentials ENTRY',data:{hasMemoryCache:!!memoryKeyCache,cacheAge:memoryKeyCache?(Date.now()-memoryKeyCache.timestamp):0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'};
    console.log('🔍 DEBUG:', JSON.stringify(logData5));
    fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData5)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
    // #endregion
    try {
      // CRITICAL FIX: Check memory cache first (handles Android SecureStore timing issues)
      // Memory cache is updated immediately when key is stored, before SecureStore flushes
      const cacheAge = memoryKeyCache ? (Date.now() - memoryKeyCache.timestamp) : 0;
      const cacheValid = memoryKeyCache && cacheAge < CACHE_TTL;
      
      // #region agent log
      const logDataCacheCheck = {location:'userApiKeyManager.ts:905',message:'MEMORY CACHE CHECK',data:{hasCache:!!memoryKeyCache,cacheAge,cacheValid,cacheTTL:CACHE_TTL,hasKey:!!memoryKeyCache?.key,keyLength:memoryKeyCache?.key?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
      console.log('🔍 DEBUG:', JSON.stringify(logDataCacheCheck));
      fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataCacheCheck)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
      // #endregion
      
      logger.debug('UserApiKeyManager: Memory cache check', {
        hasCache: !!memoryKeyCache,
        cacheAge,
        cacheValid,
        cacheTTL: CACHE_TTL,
      });
      
      // CRITICAL: Always use memory cache if it exists and has a key, regardless of expiration
      // This is a safety measure for Android SecureStore timing issues
      // The cache is only 5 minutes, so even if expired, it's still recent enough to be valid
      if (memoryKeyCache && memoryKeyCache.key) {
        // Only reject if cache is extremely old (more than 1 hour) to prevent using stale keys after app restart
        const oneHour = 60 * 60 * 1000;
        const isExtremelyOld = cacheAge > oneHour;
        
        if (!isExtremelyOld) {
          logger.info('🔍 DEBUG: Using memory cache for credentials', {
            hasKey: !!memoryKeyCache.key,
            keyLength: memoryKeyCache.key.length,
            hasUsername: !!memoryKeyCache.username,
            cacheAge,
            cacheValid,
          });
          // #region agent log
          const logDataCache = {location:'userApiKeyManager.ts:870',message:'getAuthCredentials - USING MEMORY CACHE',data:{hasKey:!!memoryKeyCache.key,keyLength:memoryKeyCache.key.length,hasUsername:!!memoryKeyCache.username,cacheAge,cacheValid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
          console.log('🔍 DEBUG:', JSON.stringify(logDataCache));
          fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataCache)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
          // #endregion
          return {
            key: memoryKeyCache.key,
            username: memoryKeyCache.username,
            clientId: memoryKeyCache.clientId,
          };
        } else {
          logger.warn('🔍 DEBUG: Memory cache too old (over 1 hour), ignoring', {
            cacheAge,
            oneHour,
          });
          // Clear stale cache
          memoryKeyCache = null;
        }
      } else if (memoryKeyCache && !memoryKeyCache.key) {
        logger.warn('🔍 DEBUG: Memory cache exists but has no key', {
          hasCache: !!memoryKeyCache,
        });
        // Clear invalid cache
        memoryKeyCache = null;
      }
      
      // Try raw key first (fastest path)
      let key = await SecureStore.getItemAsync(FOMIO_USER_API_KEY);
      
      // CRITICAL FIX: If SecureStore doesn't have the key but memory cache does (even if expired),
      // use the memory cache as a fallback (handles Android SecureStore timing issues)
      if (!key && memoryKeyCache && memoryKeyCache.key) {
        logger.warn('🔍 DEBUG: SecureStore key not found, using memory cache as fallback', {
          cacheAge: Date.now() - memoryKeyCache.timestamp,
          hasKey: !!memoryKeyCache.key,
        });
        // #region agent log
        const logDataCacheFallback = {location:'userApiKeyManager.ts:935',message:'USING MEMORY CACHE AS FALLBACK',data:{hasKey:!!memoryKeyCache.key,keyLength:memoryKeyCache.key.length,cacheAge:Date.now()-memoryKeyCache.timestamp},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
        console.log('🔍 DEBUG:', JSON.stringify(logDataCacheFallback));
        fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataCacheFallback)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
        // #endregion
        return {
          key: memoryKeyCache.key,
          username: memoryKeyCache.username,
          clientId: memoryKeyCache.clientId,
        };
      }
      let username = await SecureStore.getItemAsync(FOMIO_USER_API_USERNAME);
      let clientId = await SecureStore.getItemAsync(CLIENT_ID_STORAGE_KEY);
      // #region agent log
      const logData6 = {location:'userApiKeyManager.ts:825',message:'AFTER raw key check',data:{hasRawKey:!!key,keyLength:key?.length||0,hasUsername:!!username,hasClientId:!!clientId,keyIsJson:key?.startsWith('{')||false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,E'};
      console.log('🔍 DEBUG:', JSON.stringify(logData6));
      fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData6)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
      // #endregion
      
      logger.debug('UserApiKeyManager: getAuthCredentials - raw key check', {
        hasRawKey: !!key,
        hasUsername: !!username,
        hasClientId: !!clientId,
        keyLength: key?.length || 0,
      });
      // Enhanced debug logging
      if (!key) {
        logger.warn('🔍 DEBUG: getAuthCredentials - RAW KEY NOT FOUND', {
          storageKey: FOMIO_USER_API_KEY,
          checkedAt: new Date().toISOString(),
        });
      }
      
      // If key looks like JSON (old format), extract the actual key
      if (key && key.startsWith('{')) {
        try {
          const parsed = JSON.parse(key);
          key = parsed.key || key;
          if (!username && parsed.username) {
            username = parsed.username;
          }
          if (!clientId && parsed.clientId) {
            clientId = parsed.clientId;
          }
          logger.debug('UserApiKeyManager: Extracted key from JSON format');
        } catch {
          // Not JSON, use as-is
        }
      }
      
      // Fallback to JSON data if raw key not found
      if (!key) {
        logger.debug('UserApiKeyManager: Raw key not found, trying JSON storage...');
        // #region agent log
        const logData7 = {location:'userApiKeyManager.ts:853',message:'FALLBACK to JSON storage',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
        console.log('🔍 DEBUG:', JSON.stringify(logData7));
        fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData7)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
        // #endregion
        const apiKeyData = await this.getApiKey();
        // #region agent log
        const logData8 = {location:'userApiKeyManager.ts:856',message:'AFTER JSON storage check',data:{hasApiKeyData:!!apiKeyData,hasKey:!!apiKeyData?.key,keyLength:apiKeyData?.key?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
        console.log('🔍 DEBUG:', JSON.stringify(logData8));
        fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData8)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
        // #endregion
        if (apiKeyData?.key) {
          key = apiKeyData.key;
          username = username || apiKeyData.username || null;
          clientId = clientId || apiKeyData.clientId || null;
          logger.debug('UserApiKeyManager: Found key in JSON storage');
        } else {
          logger.debug('UserApiKeyManager: JSON storage also empty');
        }
      }
      
      // Final fallback to legacy storage
      if (!key) {
        logger.debug('UserApiKeyManager: Trying legacy storage...');
        key = await SecureStore.getItemAsync(LEGACY_API_KEY);
        if (key) {
          logger.debug('UserApiKeyManager: Found key in legacy storage');
        }
      }
      if (!clientId) {
        clientId = await SecureStore.getItemAsync(LEGACY_CLIENT_ID);
      }
      
      if (!key) {
        logger.error('🔍 DEBUG: getAuthCredentials - NO KEY FOUND IN ANY LOCATION', {
          checkedRaw: true,
          checkedJson: true,
          checkedLegacy: true,
          storageKeys: {
            raw: FOMIO_USER_API_KEY,
            json: API_KEY_STORAGE_KEY,
            legacy: LEGACY_API_KEY,
          },
          timestamp: new Date().toISOString(),
        });
        
        // CRITICAL FIX: On Android, SecureStore may need additional time to flush
        // Try one more time with a delay to handle race conditions
        logger.warn('🔍 DEBUG: Retrying key retrieval after delay (Android SecureStore flush)');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Retry all storage locations
        key = await SecureStore.getItemAsync(FOMIO_USER_API_KEY);
        if (!key) {
          const retryApiKeyData = await this.getApiKey();
          if (retryApiKeyData?.key) {
            key = retryApiKeyData.key;
            username = username || retryApiKeyData.username || null;
            clientId = clientId || retryApiKeyData.clientId || null;
            logger.info('🔍 DEBUG: Found key in JSON storage on retry');
          }
        }
        if (!key) {
          key = await SecureStore.getItemAsync(LEGACY_API_KEY);
          if (key) {
            logger.info('🔍 DEBUG: Found key in legacy storage on retry');
          }
        }
        
        if (!key) {
          // #region agent log
          const logData9 = {location:'userApiKeyManager.ts:878',message:'getAuthCredentials EXIT - NO KEY AFTER RETRY',data:{checkedRaw:true,checkedJson:true,checkedLegacy:true,retried:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'};
          console.log('🔍 DEBUG:', JSON.stringify(logData9));
          fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData9)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
          // #endregion
          return null;
        } else {
          logger.info('🔍 DEBUG: Key found on retry - Android SecureStore timing issue resolved');
        }
      }
      
      logger.debug('UserApiKeyManager: Successfully retrieved credentials', {
        hasKey: !!key,
        hasUsername: !!username,
        hasClientId: !!clientId,
      });
      
      // Update memory cache with retrieved credentials (keeps cache fresh)
      if (key) {
        memoryKeyCache = {
          key,
          username: username || undefined,
          clientId: clientId || undefined,
          timestamp: Date.now(),
        };
      }
      
      // #region agent log
      const logData10 = {location:'userApiKeyManager.ts:890',message:'getAuthCredentials EXIT - SUCCESS',data:{hasKey:!!key,keyLength:key.length,hasUsername:!!username,hasClientId:!!clientId,fromMemoryCache:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'};
      console.log('🔍 DEBUG:', JSON.stringify(logData10));
      fetch('http://127.0.0.1:7242/ingest/175fba8e-6f1b-43ce-9829-bea85f53fa72',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData10)}).catch((e)=>console.log('🔍 DEBUG FETCH ERROR:',e));
      // #endregion
      return { key, username: username || undefined, clientId: clientId || undefined };
    } catch (error: any) {
      // Don't log null errors from SecureStore
      if (error && String(error) !== 'null' && error?.message !== 'null') {
        logger.error('UserApiKeyManager: Failed to get auth credentials', error);
      }
      return null;
    }
  }

  /**
   * Check if user has valid auth credentials
   * @returns true if authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const credentials = await this.getAuthCredentials();
    return credentials !== null && !!credentials.key;
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
      // Also clear unified storage keys
      await SecureStore.deleteItemAsync(FOMIO_USER_API_KEY);
      await SecureStore.deleteItemAsync(FOMIO_USER_API_USERNAME);
      // Clear legacy keys
      await SecureStore.deleteItemAsync(LEGACY_API_KEY);
      await SecureStore.deleteItemAsync(LEGACY_CLIENT_ID);
      // Clear memory cache
      memoryKeyCache = null;
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
