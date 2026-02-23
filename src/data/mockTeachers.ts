export type SubjectId = "math" | "english" | "psychometric" | "language";

export interface MockTeacher {
  id: string;
  name: string;
  photo: string;
  bio: string;
  subjects: SubjectId[];
  rating: number;
  reviewCount: number;
  specialties: string[];
  availabilityLabel: string;
  /** From API: teacher contact details for student view */
  email?: string;
  phone?: string | null;
}

export const MOCK_TEACHERS: MockTeacher[] = [
  {
    id: "t1",
    name: "דני כהן",
    photo: "",
    bio: "מורה למתמטיקה מעל 15 שנה. מתמחה בהכנה לבגרות ובחטיבה.",
    subjects: ["math"],
    rating: 4.9,
    reviewCount: 124,
    specialties: ["בגרות 3–5 יח׳", "חטיבה", "יסודי"],
    availabilityLabel: "פנוי השבוע",
  },
  {
    id: "t2",
    name: "מיכל לוי",
    photo: "",
    bio: "מורה לאנגלית ולשון. גישה חווייתית והתאמה אישית.",
    subjects: ["english", "language"],
    rating: 4.8,
    reviewCount: 89,
    specialties: ["אנגלית מדוברת", "הבעה", "חטיבה"],
    availabilityLabel: "פנוי מחר",
  },
  {
    id: "t3",
    name: "יוסי אברהם",
    photo: "",
    bio: "מורה למתמטיקה והכנה למא״ה. מומחה לפסיכומטרי צבאי ולצו ראשון.",
    subjects: ["psychometric", "math"],
    rating: 5.0,
    reviewCount: 67,
    specialties: ["חשיבה כמותית", "מתמטיקה", "הכנה למא״ה"],
    availabilityLabel: "פנוי היום",
  },
  {
    id: "t4",
    name: "נועה פרץ",
    photo: "",
    bio: "מורה למתמטיקה ולשון. סבלנית ומתאימה את השיעור לרמת התלמיד.",
    subjects: ["math", "language"],
    rating: 4.7,
    reviewCount: 156,
    specialties: ["יסודי", "חטיבה", "לשון"],
    availabilityLabel: "פנוי השבוע",
  },
  {
    id: "t5",
    name: "רועי גולן",
    photo: "",
    bio: "מורה לאנגלית. דגש על שיחה ובטחון עצמי.",
    subjects: ["english"],
    rating: 4.9,
    reviewCount: 78,
    specialties: ["אנגלית יסודי–תיכון", "בגרות"],
    availabilityLabel: "פנוי מחר",
  },
  {
    id: "t6",
    name: "שירה דוד",
    photo: "",
    bio: "מורה למתמטיקה ואנגלית. הכנה ממוקדת לקורס טיס ולמסלולי מודיעין.",
    subjects: ["psychometric", "math", "english"],
    rating: 4.8,
    reviewCount: 92,
    specialties: ["הכנה לקורס טיס", "מתמטיקה", "אנגלית"],
    availabilityLabel: "פנוי השבוע",
  },
];
