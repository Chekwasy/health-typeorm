/**
 * =========================================
 * EXTRACT APPOINTMENT REASON
 * =========================================
 *
 * Attempts to infer the reason
 * for the consultation from
 * conversational language.
 *
 * Used for:
 * - booking metadata
 * - doctor context
 * - future AI improvements
 * - analytics/reporting
 * =========================================
 */

export function extractReason(message: string) {
  /**
   * NORMALIZE
   */

  const text = message.toLowerCase();

  /**
   * =====================================
   * SKIN / DERMATOLOGY
   * =====================================
   */

  if (
    [
      "skin",
      "rash",
      "eczema",
      "acne",
      "pimple",
      "allergy",
      "itching",
      "dermatology",
      "fungal",
      "infection",
    ].some((word) => text.includes(word))
  ) {
    return "Skin consultation";
  }

  /**
   * =====================================
   * HEART / CARDIOLOGY
   * =====================================
   */

  if (
    [
      "heart",
      "chest pain",
      "heartbeat",
      "high blood pressure",
      "bp",
      "cardiology",
      "palpitations",
      "hypertension",
    ].some((word) => text.includes(word))
  ) {
    return "Heart consultation";
  }

  /**
   * =====================================
   * DENTAL
   * =====================================
   */

  if (
    [
      "tooth",
      "teeth",
      "gum",
      "dental",
      "dentist",
      "toothache",
      "mouth pain",
      "cavity",
    ].some((word) => text.includes(word))
  ) {
    return "Dental consultation";
  }

  /**
   * =====================================
   * PEDIATRIC
   * =====================================
   */

  if (
    ["child", "children", "baby", "kid", "infant", "pediatric", "newborn"].some(
      (word) => text.includes(word),
    )
  ) {
    return "Pediatric consultation";
  }

  /**
   * =====================================
   * FEVER / GENERAL ILLNESS
   * =====================================
   */

  if (
    [
      "fever",
      "malaria",
      "body pain",
      "weakness",
      "tired",
      "fatigue",
      "headache",
      "illness",
      "sick",
      "infection",
    ].some((word) => text.includes(word))
  ) {
    return "General medical consultation";
  }

  /**
   * =====================================
   * STOMACH / DIGESTIVE
   * =====================================
   */

  if (
    [
      "stomach",
      "ulcer",
      "vomiting",
      "diarrhea",
      "constipation",
      "abdominal pain",
      "digestion",
      "food poisoning",
    ].some((word) => text.includes(word))
  ) {
    return "Digestive consultation";
  }

  /**
   * =====================================
   * EYE
   * =====================================
   */

  if (
    [
      "eye",
      "eyes",
      "vision",
      "blurred vision",
      "eye pain",
      "sight",
      "ophthalmology",
    ].some((word) => text.includes(word))
  ) {
    return "Eye consultation";
  }

  /**
   * =====================================
   * ENT
   * =====================================
   */

  if (
    [
      "ear",
      "nose",
      "throat",
      "tonsil",
      "sinus",
      "hearing",
      "voice",
      "ent",
    ].some((word) => text.includes(word))
  ) {
    return "ENT consultation";
  }

  /**
   * =====================================
   * ORTHOPEDIC
   * =====================================
   */

  if (
    [
      "leg pain",
      "arm pain",
      "joint pain",
      "bone",
      "fracture",
      "waist pain",
      "back pain",
      "orthopedic",
      "muscle pain",
    ].some((word) => text.includes(word))
  ) {
    return "Orthopedic consultation";
  }

  /**
   * =====================================
   * WOMEN HEALTH
   * =====================================
   */

  if (
    [
      "pregnancy",
      "menstrual",
      "period pain",
      "fertility",
      "gynecology",
      "woman",
      "women health",
    ].some((word) => text.includes(word))
  ) {
    return "Gynecology consultation";
  }

  /**
   * =====================================
   * MENTAL HEALTH
   * =====================================
   */

  if (
    [
      "depression",
      "stress",
      "anxiety",
      "mental health",
      "panic",
      "therapy",
      "psychiatric",
    ].some((word) => text.includes(word))
  ) {
    return "Mental health consultation";
  }

  /**
   * =====================================
   * DEFAULT
   * =====================================
   */

  return "General consultation";
}
