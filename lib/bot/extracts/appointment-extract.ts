/**
 * =========================================
 * EXTRACT APPOINTMENT REFERENCE
 * =========================================
 */

export function extractAppointmentReference(message: string) {
  /**
   * UUID MATCH
   */

  const uuidMatch = message.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  );

  if (uuidMatch) {
    return uuidMatch[0];
  }

  /**
   * FALLBACK SIMPLE REFERENCE
   */

  const simpleMatch = message.match(/\b[a-z0-9]{6,}\b/i);

  if (simpleMatch) {
    return simpleMatch[0];
  }

  return null;
}
