"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/design/BackLink";
import { CodeLogin } from "@/components/auth/CodeLogin";

export default function StudentLoginPage() {
  const router = useRouter();
  const [testLoading, setTestLoading] = useState<"teacher" | "student" | null>(null);
  const [testMessage, setTestMessage] = useState("");

  async function handleTestLogin(role: "teacher" | "student") {
    setTestLoading(role);
    try {
      const res = await fetch("/api/auth/test-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestMessage(data.error || "כניסה לבדיקה נכשלה");
        return;
      }
      router.push(role === "teacher" ? "/teacher" : "/student");
      router.refresh();
    } catch {
      setTestMessage("שגיאת רשת");
    } finally {
      setTestLoading(null);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
        <BackLink href="/login" label="חזרה לבחירת סוג כניסה" />
        <div className="space-y-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-[var(--color-text)]">התחברות כתלמיד/ה</h1>
            <p className="mt-2 text-sm">
              <Link href="/login/teacher" className="text-[var(--color-primary)] underline hover:no-underline">
                מורה? היכנס כאן
              </Link>
            </p>
          </div>
          <CodeLogin role="student" askStudentPhone />
        </div>

        {/* The test-login API refuses in production; don't offer real students a dead button. */}
        {process.env.NODE_ENV !== "production" && (
        <Card className="rounded-2xl shadow-soft border-border border-dashed">
          <CardContent className="p-6 space-y-3">
            <p className="text-sm font-medium text-muted-foreground text-center">
              כניסה לבדיקה (ללא אימייל)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!!testLoading}
                onClick={() => handleTestLogin("teacher")}
              >
                {testLoading === "teacher" ? "נכנס…" : "כניסה כמורה"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!!testLoading}
                onClick={() => handleTestLogin("student")}
              >
                {testLoading === "student" ? "נכנס…" : "כניסה כתלמיד"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              חשבונות: teacher@test.com / student@test.com (לאחר הרצת seed)
            </p>
            {testMessage && <p className="text-center text-sm text-red-700">{testMessage}</p>}
          </CardContent>
        </Card>
        )}
    </div>
  );
}
