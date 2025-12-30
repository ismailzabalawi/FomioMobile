// Lazy-load node-forge - it may not be available in React Native environments
let forge: any = null;

function loadForge(): any {
  if (forge !== null) {
    return forge;
  }
  
  try {
    forge = require('node-forge');
    return forge;
  } catch (error) {
    // node-forge is not available (e.g., in React Native)
    // This is expected - userApiKeyManager will use Web Crypto API fallback
    return null;
  }
}

/**
 * Generate RSA keypair for Discourse User API Key authentication
 * @param bits Key size in bits (default: 2048)
 * @returns Object containing publicKeyPem and privateKeyPem
 * @throws Error if node-forge is not available
 */
export function generateRsaKeypair(bits: number = 2048): { publicKeyPem: string; privateKeyPem: string } {
  const forgeLib = loadForge();
  if (!forgeLib) {
    throw new Error('node-forge is not available in this environment. Use Web Crypto API or react-native-quick-crypto instead.');
  }
  
  const keypair = forgeLib.pki.rsa.generateKeyPair(bits);
  
  const publicKeyPem = forgeLib.pki.publicKeyToPem(keypair.publicKey);
  const privateKeyPem = forgeLib.pki.privateKeyToPem(keypair.privateKey);
  
  return {
    publicKeyPem,
    privateKeyPem,
  };
}

/**
 * Derive public key from private key
 * @param privateKeyPem PEM-formatted private key
 * @returns PEM-formatted public key
 * @throws Error if node-forge is not available
 */
export function derivePublicKeyFromPrivate(privateKeyPem: string): string {
  const forgeLib = loadForge();
  if (!forgeLib) {
    throw new Error('node-forge is not available in this environment. Use Web Crypto API or react-native-quick-crypto instead.');
  }
  
  const privateKey = forgeLib.pki.privateKeyFromPem(privateKeyPem);
  const publicKey = forgeLib.pki.rsa.setPublicKey(privateKey.n, privateKey.e);
  return forgeLib.pki.publicKeyToPem(publicKey);
}

/**
 * Decrypt base64-encoded payload using RSA-OAEP with SHA-256
 * Discourse encrypts User API Key payloads using RSA-OAEP, not PKCS#1 v1.5
 * @param base64 Base64-encoded encrypted payload
 * @param privateKeyPem PEM-formatted private key
 * @returns Decrypted UTF-8 string
 * @throws Error if node-forge is not available or decryption fails
 */
export function decryptPayloadBase64ToUtf8(base64: string, privateKeyPem: string): string {
  const forgeLib = loadForge();
  if (!forgeLib) {
    throw new Error('node-forge is not available in this environment. Use Web Crypto API or react-native-quick-crypto instead.');
  }
  
  try {
    const privateKey = forgeLib.pki.privateKeyFromPem(privateKeyPem);
    const encryptedBytes = forgeLib.util.decode64(base64);
    
    // Try RSA-OAEP with SHA-256/SHA-256 first (Discourse standard)
    try {
      const decryptedBytes = privateKey.decrypt(encryptedBytes, 'RSA-OAEP', {
        md: forgeLib.md.sha256.create(),
        mgf1: {
          md: forgeLib.md.sha256.create()
        }
      });
      return forgeLib.util.decodeUtf8(decryptedBytes);
    } catch (sha256Error) {
      console.log('SHA-256/SHA-256 decryption failed, trying SHA-256/SHA-1...');
    }
    
    // Fallback: Try RSA-OAEP with SHA-256 and MGF1-SHA-1 (some implementations use this)
    try {
      const decryptedBytes = privateKey.decrypt(encryptedBytes, 'RSA-OAEP', {
        md: forgeLib.md.sha256.create(),
        mgf1: {
          md: forgeLib.md.sha1.create()
        }
      });
      return forgeLib.util.decodeUtf8(decryptedBytes);
    } catch (sha1Error) {
      console.log('SHA-256/SHA-1 decryption failed, trying PKCS#1 v1.5...');
    }
    
    // Last fallback: Try PKCS#1 v1.5 (legacy Discourse versions)
    try {
      const decryptedBytes = privateKey.decrypt(encryptedBytes);
      return forgeLib.util.decodeUtf8(decryptedBytes);
    } catch (pkcsError) {
      throw new Error('All decryption schemes failed. Key mismatch or corrupted data.');
    }
  } catch (error: any) {
    console.error('Decryption error:', error?.message || error);
    throw new Error(`Failed to decrypt payload: ${error?.message || 'Invalid key or corrupted data'}`);
  }
}
