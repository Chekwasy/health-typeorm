/**
 * =========================================
 * GET ACTIVE INTENT
 * =========================================
 *
 * Purpose:
 * - determine current conversation intent
 * - prioritize latest extracted intent
 * - fallback to saved conversation memory
 *
 * Example:
 *
 * Existing memory:
 * BOOK
 *
 * User says:
 * "tomorrow evening"
 *
 * Extracted intent:
 * UNKNOWN
 *
 * Result:
 * BOOK
 *
 * This preserves conversational continuity.
 * =========================================
 */

export function getActiveIntent({
  extractedIntent,

  context,
}: {
  extractedIntent?: string | null;

  context?: Record<string, any> | null;
}) {
  /**
   * =====================================
   * USE LATEST VALID INTENT
   * =====================================
   */

  if (extractedIntent && extractedIntent !== "UNKNOWN") {
    return extractedIntent;
  }

  /**
   * =====================================
   * FALLBACK TO MEMORY
   * =====================================
   */

  if (context?.intent) {
    return context.intent;
  }

  /**
   * =====================================
   * NO ACTIVE INTENT
   * =====================================
   */

  return "UNKNOWN";
}
