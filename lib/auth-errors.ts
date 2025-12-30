export function mapAuthError(error: unknown): string {
  const message = (error as { message?: string })?.message || '';
  const lower = message.toLowerCase();

  if (lower.includes('cancel')) {
    return 'Sign-in was cancelled. Please try again when ready.';
  }
  if (lower.includes('network') || lower.includes('connection')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  if (lower.includes('decrypt') || lower.includes('payload')) {
    return 'Failed to process authorization response. Please try again.';
  }
  if (message) {
    return message;
  }

  return 'Sign-in failed. Please try again.';
}
