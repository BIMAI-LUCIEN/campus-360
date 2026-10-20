import { timingSafeEqual } from 'node:crypto';

/**
 * Validates a health check secret securely using timing-safe comparison.
 * Returns false if expected is undefined, empty, or provided is null/empty.
 */
export const isValidHealthSecret = (
  provided: string | null | undefined,
  expected: string | undefined
): boolean => {
  if (!expected || expected.trim() === '') return false;
  if (!provided || provided.trim() === '') return false;

  const providedBuffer = Buffer.from(provided, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
};
