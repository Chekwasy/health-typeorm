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

    keywords: ["dentist", "tooth doctor", "dental", "teeth"],
  },

  {
    name: "Pediatrician",

    keywords: [
      "children doctor",
      "baby doctor",
      "pediatrician",
      "kids doctor",
      "child specialist",
    ],
  },

  {
    name: "General Physician",

    keywords: ["doctor", "general doctor", "physician", "gp"],
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
