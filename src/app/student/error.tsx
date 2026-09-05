"use client";

import { ErrorState } from "@/components/ErrorState";

export default function StudentError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState {...props} scope="student/error" title="שגיאה" homeHref="/student" homeLabel="חזרה" />
  );
}
