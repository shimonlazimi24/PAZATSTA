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
  /** From API: single specialization string (student-facing; email/phone not shown) */
  specialization?: string | null;
  email?: string;
  phone?: string | null;
}
