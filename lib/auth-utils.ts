/**
 * Parse URL parameters from a URL string
 * Handles both query strings and hash fragments
 * Similar to DiscourseMobile's parseURLparameters
 * 
 * @param url - URL string to parse
 * @returns Record of parameter key-value pairs
 */
export function parseURLParameters(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  
  try {
    // Try to parse as URL first
    const urlObj = new URL(url);
    
    // Parse query string
    urlObj.searchParams.forEach((value, key) => {
      params[key] = decodeURIComponent(value);
    });
    
    // Parse hash fragment if present (some OAuth flows use this)
    if (urlObj.hash) {
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      hashParams.forEach((value, key) => {
        params[key] = decodeURIComponent(value);
      });
    }
  } catch {
    // Fallback: manual parsing for non-standard URLs (e.g., custom schemes like fomio://)
    const parts = url.split('?');
    if (parts.length > 1) {
      const queryString = parts[1].split('#')[0];
      queryString.split('&').forEach((param) => {
        const [key, value] = param.split('=');
        if (key && value) {
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
    }
    
    // Also check for hash fragment in fallback
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hashString = url.substring(hashIndex + 1);
      hashString.split('&').forEach((param) => {
        const [key, value] = param.split('=');
        if (key && value) {
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
    }
  }
  
  return params;
}

