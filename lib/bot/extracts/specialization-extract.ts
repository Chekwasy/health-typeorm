/**
 * =========================================
 * SPECIALIZATION KEYWORDS
 * =========================================
 */

const SPECIALIZATIONS = [
  {
    name: "Dermatologist",

    keywords: ["skin doctor", "dermatologist", "skin specialist", "skin"],
  },

  {
    name: "Cardiologist",

    keywords: ["heart doctor", "cardiologist", "heart specialist", "heart"],
  },

  {
    name: "Dentist",

    keywords: ["dentist", "tooth doctor", "dental", "teeth", "gum"],
  },

  {
    name: "Pediatrician",

    keywords: ["children", "baby", "pediatrician", "kids", "child"],
  },

  {
    name: "General Physician",

    keywords: ["doctor", "general doctor", "physician", "gp", "dr"],
  },
];

/**
 * =========================================
 * EXTRACT SPECIALIZATION
 * =========================================
 */

export function extractSpecialization(message: string) {
  for (const item of SPECIALIZATIONS) {
    const found = item.keywords.find((keyword) => message.includes(keyword));

    if (found) {
      return item.name;
    }
  }

  return null;
}
