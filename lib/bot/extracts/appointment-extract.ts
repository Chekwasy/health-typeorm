/**
 * =========================================
 * EXTRACT APPOINTMENT REFERENCE
 * =========================================
 *
 * Supports:
 * - plain uuid
 * - uuid inside ""
 * - uuid inside ''
 * - uuid inside brackets
 * - uppercase/lowercase
 *
 * Examples:
 *
 * 4257ee5b-6e5b-40da-9fb0-a2db5508cd55
 *
 * "4257ee5b-6e5b-40da-9fb0-a2db5508cd55"
 *
 * '4257ee5b-6e5b-40da-9fb0-a2db5508cd55'
 *
 * ref: 4257ee5b-6e5b-40da-9fb0-a2db5508cd55
 * =========================================
 */

export function extractAppointmentReference(rawMessage: string) {
  /**
   * NORMALIZE MESSAGE
   */

  const message = rawMessage.trim();

  /**
   * =====================================
   * UUID REGEX
   * =====================================
   */

  const uuidRegex =
    /["'\s(]*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})["'\s)]*/i;

  /**
   * MATCH UUID
   */

  const uuidMatch = message.match(uuidRegex);

  /**
   * UUID FOUND
   */

  if (uuidMatch && uuidMatch[1]) {
    console.log("UUID REFERENCE FOUND", {
      reference: uuidMatch[1],
    });

    return uuidMatch[1];
  }

  /**
   * =====================================
   * FALLBACK REFERENCE
   * =====================================
   *
   * Supports:
   * REF12345
   * booking123
   * abc123xyz
   * =====================================
   */

  const simpleMatch = message.match(/\b[a-z0-9]{6,}\b/i);

  /**
   * SIMPLE MATCH FOUND
   */

  if (simpleMatch && simpleMatch[0]) {
    console.log("SIMPLE REFERENCE FOUND", {
      reference: simpleMatch[0],
    });

    return simpleMatch[0];
  }

  /**
   * NO MATCH
   */

  return null;
}
