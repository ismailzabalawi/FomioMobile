import forge from 'node-forge';

/**
 * Generate RSA keypair for Discourse User API Key authentication
 * @param bits Key size in bits (default: 2048)
 * @returns Object containing publicKeyPem and privateKeyPem
 */
export function generateRsaKeypair(bits: number = 2048): { publicKeyPem: string; privateKeyPem: string } {
  const keypair = forge.pki.rsa.generateKeyPair(bits);
  
  const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
  
  return {
    publicKeyPem,
    privateKeyPem,
  };
}

/**
 * Decrypt base64-encoded payload using RSA PKCS#1 v1.5
 * @param base64 Base64-encoded encrypted payload
 * @param privateKeyPem PEM-formatted private key
 * @returns Decrypted UTF-8 string
 */
export function decryptPayloadBase64ToUtf8(base64: string, privateKeyPem: string): string {
  try {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const encryptedBytes = forge.util.decode64(base64);
    
    // Decrypt using RSAES-PKCS1-V1_5
    const decryptedBytes = privateKey.decrypt(encryptedBytes, 'RSAES-PKCS1-V1_5');
    
    return forge.util.decodeUtf8(decryptedBytes);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt payload. Invalid key or corrupted data.');
  }
}
