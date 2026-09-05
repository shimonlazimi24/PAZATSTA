"use client";

import { ErrorState } from "@/components/ErrorState";

export default function TeacherError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      {...props}
      scope="teacher/error"
      title="שגיאה בדף המורה"
      homeHref="/teacher/dashboard"
      homeLabel="חזרה ללוח המורה"
    />
  );
}
