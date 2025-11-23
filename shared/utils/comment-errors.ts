/**
 * Utility functions for handling comment-related errors
 * Provides user-friendly error messages and error detection
 */

/**
 * Detects if an error is related to a comment being too short
 * @param error - The error to check (string, Error, or undefined)
 * @returns true if the error indicates the comment is too short
 */
export function isCommentTooShortError(error: string | Error | undefined): boolean {
  if (!error) return false;
  const errorStr = error instanceof Error ? error.message : String(error);
  const lowerError = errorStr.toLowerCase();
  return (
    lowerError.includes('too short') ||
    lowerError.includes('minimum') ||
    lowerError.includes('at least') ||
    lowerError.includes('body is too short') ||
    lowerError.includes('post is too short') ||
    lowerError.includes('raw is too short')
  );
}

/**
 * Detects if an error is related to consecutive replies being limited
 * @param error - The error to check (string, Error, or undefined)
 * @returns true if the error indicates too many consecutive replies
 */
export function isConsecutiveReplyError(error: string | Error | undefined): boolean {
  if (!error) return false;
  const errorStr = error instanceof Error ? error.message : String(error);
  const lowerError = errorStr.toLowerCase();
  return (
    lowerError.includes('consecutive replies') ||
    lowerError.includes('no more than') ||
    lowerError.includes('wait for someone to reply')
  );
}

/**
 * Detects if an error message is just a generic HTTP status code
 * @param error - The error to check (string, Error, or undefined)
 * @returns true if the error is just "HTTP XXX: " with no actual message
 */
export function isGenericHttpError(error: string | Error | undefined): boolean {
  if (!error) return false;
  const errorStr = error instanceof Error ? error.message : String(error);
  // Check if it's just "HTTP XXX: " or "HTTP XXX" with no meaningful message
  return /^HTTP \d{3}:?\s*$/.test(errorStr.trim());
}

/**
 * Converts an error into a user-friendly error message for comments
 * @param error - The error to convert (string, Error, or undefined)
 * @param errorsArray - Optional array of error messages from the API response
 * @returns A user-friendly error message
 */
export function getCommentErrorMessage(
  error: string | Error | undefined,
  errorsArray?: string[]
): string {
  if (!error && !errorsArray?.length) {
    return 'Failed to send comment. Please try again.';
  }

  const errorStr = error instanceof Error ? error.message : String(error);

  // If we have an errors array and the main error is generic, prefer the errors array
  if (errorsArray && errorsArray.length > 0) {
    if (isGenericHttpError(errorStr) || !errorStr || errorStr.trim() === '') {
      // Use the first error from the array, which usually contains the actual message
      const primaryError = errorsArray[0];
      if (isCommentTooShortError(primaryError)) {
        return 'Your comment is too short. Please write a bit more before sending.';
      }
      if (isConsecutiveReplyError(primaryError)) {
        return primaryError; // Discourse message is already user-friendly
      }
      return primaryError;
    }
  }

  // Handle the main error string
  if (isCommentTooShortError(errorStr)) {
    return 'Your comment is too short. Please write a bit more before sending.';
  }

  if (isConsecutiveReplyError(errorStr)) {
    // Discourse message is already user-friendly, but ensure it's clear
    return errorStr || 'You\'ve posted too many consecutive replies. Please wait for someone else to reply, or edit your previous reply instead.';
  }

  // If it's a generic HTTP error and we have no errors array, return a generic message
  if (isGenericHttpError(errorStr)) {
    return 'Failed to send comment. Please try again.';
  }

  return errorStr || 'Failed to send comment. Please try again.';
}

