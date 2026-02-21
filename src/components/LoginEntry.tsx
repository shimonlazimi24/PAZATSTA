"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";

export function LoginEntry() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--color-bg)]" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo alt="Paza" className="h-10 w-auto" width={140} height={48} />
        </div>
        <h1 className="text-2xl font-bold text-center text-[var(--color-text)]">
          התחברות
        </h1>
        <p className="text-center text-[var(--color-text-muted)]">
          בחרו איך אתם נכנסים
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/login/teacher">
            <Card className="rounded-2xl shadow-soft border-border cursor-pointer transition-shadow hover:shadow-card h-full">
              <CardContent className="p-6 text-center">
                <p className="text-lg font-semibold text-[var(--color-text)]">כמורה/ת</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  ניהול זמינות, שיעורים ודיווחים
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/login/student">
            <Card className="rounded-2xl shadow-soft border-border cursor-pointer transition-shadow hover:shadow-card h-full">
              <CardContent className="p-6 text-center">
                <p className="text-lg font-semibold text-[var(--color-text)]">כתלמיד/ה</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  קביעת שיעורים והשיעורים שלי
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
