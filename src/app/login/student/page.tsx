"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/design/BackLink";

export default function StudentLoginPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [testLoading, setTestLoading] = useState<"teacher" | "student" | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "שליחת הקוד נכשלה");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setMessage("שגיאת רשת");
    }
  }

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
        setMessage(data.error || "כניסה לבדיקה נכשלה");
        return;
      }
      router.push(role === "teacher" ? "/teacher" : "/book");
      router.refresh();
    } catch {
      setMessage("שגיאת רשת");
    } finally {
      setTestLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background" dir="rtl">
      <div className="w-full max-w-sm space-y-6">
        <BackLink href="/login" label="חזרה לבחירת סוג כניסה" />
        <Card className="rounded-2xl shadow-soft border-border">
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">התחברות כתלמיד/ה</h1>
              <p className="text-sm text-muted-foreground mt-1">הזן אימייל וטלפון — יישלח אליכם קוד לאימייל לאימות</p>
              <p className="text-sm mt-2">
                <Link href="/login/teacher" className="text-primary underline hover:no-underline">
                  מורה? היכנס כאן
                </Link>
              </p>
            </div>
            {status === "sent" ? (
              <div className="space-y-4">
                <p className="text-center text-emerald-600 text-sm">
                  נשלח קוד לאימייל. בדוק את תיבת הדואר.
                </p>
                <Link
                  href={`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}${phone.trim() ? "&phone=" + encodeURIComponent(phone.trim()) : ""}`}
                >
                  <Button className="w-full">המשך להזנת קוד</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-foreground mb-1">
                    אימייל
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={status === "loading"}
                  />
                </div>
                <div>
                  <label htmlFor="login-phone" className="block text-sm font-medium text-foreground mb-1">
                    טלפון
                  </label>
                  <Input
                    id="login-phone"
                    type="tel"
                    placeholder="050-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={status === "loading"}
                  />
                </div>
                {message && <p className="text-sm text-destructive">{message}</p>}
                <Button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full"
                >
                  {status === "loading" ? "שולח…" : "שלחו לי קוד"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
