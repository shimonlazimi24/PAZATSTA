"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TeacherDashboardContent } from "./TeacherDashboardContent";

export function TeacherDashboard() {
  return (
    <AppShell title="לוח מורה">
      <TeacherDashboardContent />
    </AppShell>
  );
}
