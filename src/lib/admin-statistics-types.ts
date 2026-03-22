/**
 * Types for GET /api/admin/statistics (admin analytics dashboard).
 */

export interface AdminStatisticsSummary {
  totalLessons: number;
  completed: number;
  canceled: number;
  cancellationRate: number;
  activeStudents: number;
  activeTeachers: number;
  /** תלמידים ייחודיים עם בדיוק שיעור אחד בטווח */
  studentsWithSingleLesson: number;
  /** תלמידים ייחודיים עם 2+ שיעורים בטווח (חוזרים בטווח) */
  studentsWithMultipleLessons: number;
  /** אחוז מתוך תלמידים פעילים שיש להם יותר משיעור אחד בטווח */
  repeatStudentsPercent: number;
}

export interface AdminStatisticsSeriesPoint {
  date: string;
  completed: number;
  canceled: number;
}

export interface AdminStatisticsCancellations {
  total: number;
  ratePercent: number;
  byReason: Array<{ reason: string; count: number }>;
  byCancelledBy: {
    student: number;
    teacher: number;
    admin: number;
    system: number;
  };
  /** True when DB has cancellationReason / cancelledBy fields populated */
  hasTracking: boolean;
}

export interface AdminStatisticsTeacherRow {
  teacherId: string;
  name: string;
  totalLessons: number;
  completed: number;
  canceled: number;
  cancellationRate: number;
  teachingHours: number;
  utilizationRate: number | null;
}

export interface AdminStatisticsTimeDistribution {
  byHour: Array<{ hour: number; count: number; label: string }>;
  byWeekday: Array<{ weekdayIndex: number; weekdayLabel: string; count: number }>;
}

export interface AdminStatisticsResponse {
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  summary: AdminStatisticsSummary;
  series: AdminStatisticsSeriesPoint[];
  cancellations: AdminStatisticsCancellations;
  teachers: AdminStatisticsTeacherRow[];
  timeDistribution: AdminStatisticsTimeDistribution;
  insights: string[];
}
