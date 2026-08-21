"use client";

import { ErrorState } from "@/components/ErrorState";

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      {...props}
      scope="admin/error"
      title="שגיאה בדף הניהול"
      homeHref="/admin"
      homeLabel="חזרה לניהול"
    />
  );
}
