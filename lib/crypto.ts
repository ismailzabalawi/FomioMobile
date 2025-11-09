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
 * Decrypt base64-encoded payload using RSA PKCS#1 v1.5
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
    
    // Decrypt using RSAES-PKCS1-V1_5
    const decryptedBytes = privateKey.decrypt(encryptedBytes, 'RSAES-PKCS1-V1_5');
    
    return forgeLib.util.decodeUtf8(decryptedBytes);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt payload. Invalid key or corrupted data.');
  }
}
