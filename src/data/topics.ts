/**
 * Screening topics: flat list for storage (currentScreeningType), grouped for UI with colors.
 */

export const SCREENING_TOPICS = [
  "צו ראשון - מבחן דפ\"ר",
  "צו ראשון - ראיון אישי",
  "יום המא\"ה - תחנות קבוצתיות",
  "יום המא\"ה - מבחנים פסיכוטכניים",
  "כלל חמ\"ן - מבחנים פסיכוטכניים (מיון ראשון)",
  "כלל חמ\"ן - ראיון אישי/מקצועי",
  "כלל חמ\"ן - מבחני מצב (דינמיקה קבוצתית)",
  "שחקים/חבצלות - מבחנים פסיכוטכניים (מיון ראשון)",
  "שחקים/חבצלות - ראיון אישי/מקצועי",
  "שחקים/חבצלות - מבחני מצב (דינמיקה קבוצתית)",
  "קורס טיס - ירפ\"א א' (מבחנים פסיכוטכניים)",
  "קורס טיס - ירפ\"א ב' (ראיון פסיכולוג)",
  "סייבר - מיון ראשוני (מבחנים פסיכוטכניים)",
  "עתודה אקדמאית - ראיון אישי",
  "ייעודי קצונה - ראיון אישי/דינמיקה קבוצתית",
  "שנות שירות / מכינה / גנע חובלים",
  "דפ״ר משטרה",
  "שנות שירות / מכינה",
  "גדנע חובלים",
] as const;

export type ScreeningTopic = (typeof SCREENING_TOPICS)[number];

export type TopicGroup = {
  label: string;
  color: string; // Tailwind class or inline style
  topics: readonly string[];
};

/** Groups for UI: color by category; "אחר" section contains miscellaneous topics. */
export const TOPIC_GROUPS: TopicGroup[] = [
  {
    label: "צו ראשון",
    color: "bg-green-100 border-green-300 text-green-900",
    topics: ["צו ראשון - מבחן דפ\"ר", "צו ראשון - ראיון אישי"],
  },
  {
    label: "יום המאה",
    color: "bg-yellow-100 border-yellow-300 text-yellow-900",
    topics: ["יום המא\"ה - תחנות קבוצתיות", "יום המא\"ה - מבחנים פסיכוטכניים"],
  },
  {
    label: "טייס",
    color: "bg-blue-100 border-blue-300 text-blue-900",
    topics: [
      "קורס טיס - ירפ\"א א' (מבחנים פסיכוטכניים)",
      "קורס טיס - ירפ\"א ב' (ראיון פסיכולוג)",
    ],
  },
  {
    label: "כלל חמ\"ן",
    color: "bg-purple-100 border-purple-300 text-purple-900",
    topics: [
      "כלל חמ\"ן - מבחנים פסיכוטכניים (מיון ראשון)",
      "כלל חמ\"ן - ראיון אישי/מקצועי",
      "כלל חמ\"ן - מבחני מצב (דינמיקה קבוצתית)",
      "שחקים/חבצלות - מבחנים פסיכוטכניים (מיון ראשון)",
      "שחקים/חבצלות - ראיון אישי/מקצועי",
      "שחקים/חבצלות - מבחני מצב (דינמיקה קבוצתית)",
    ],
  },
  {
    label: "אחר",
    color: "bg-gray-50 border-gray-300 text-gray-900",
    topics: [
      "סייבר - מיון ראשוני (מבחנים פסיכוטכניים)",
      "ייעודי קצונה - ראיון אישי/דינמיקה קבוצתית",
      "עתודה אקדמאית - ראיון אישי",
      "צו ראשון - מבחן דפ\"ר",
      "שנות שירות / מכינה / גנע חובלים",
      "דפ״ר משטרה",
      "שנות שירות / מכינה",
      "גדנע חובלים",
    ],
  },
];

/** Per-topic color overrides (for "אחר" section): סייבר black, ייעודי/עתודה orange, דפ\"ר red, שנות שירות white border. */
export const TOPIC_COLOR_OVERRIDE: Record<string, string> = {
  "סייבר - מיון ראשוני (מבחנים פסיכוטכניים)": "bg-gray-900 border-gray-700 text-white",
  "ייעודי קצונה - ראיון אישי/דינמיקה קבוצתית": "bg-orange-100 border-orange-300 text-orange-900",
  "עתודה אקדמאית - ראיון אישי": "bg-orange-100 border-orange-300 text-orange-900",
  "צו ראשון - מבחן דפ\"ר": "bg-red-100 border-red-300 text-red-900",
  "שנות שירות / מכינה / גנע חובלים": "bg-white border-2 border-gray-400 text-gray-900",
};
