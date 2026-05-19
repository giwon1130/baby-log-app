/**
 * Extract a human-readable error message from any thrown value.
 * Used in catch blocks where the value may be Error / string / unknown.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err) return err
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg) return msg
  }
  return fallback
}
