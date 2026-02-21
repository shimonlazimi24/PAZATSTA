"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { BackLink } from "@/components/design/BackLink";

export default function TeacherLoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background" dir="rtl">
      <div className="w-full max-w-sm space-y-6">
        <BackLink href="/login" label="חזרה לבחירת סוג כניסה" />
        <div className="flex justify-center">
          <Logo alt="Paza" className="h-9 w-auto object-contain" width={120} height={40} />
        </div>
        <Card className="rounded-2xl shadow-soft border-border">
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">כניסה למורים</h1>
              <p className="text-sm text-muted-foreground mt-1">
                הזן את האימייל שלך לקבלת קוד. רק חשבונות מורים יכולים להיכנס מכאן.
              </p>
            </div>
            {status === "sent" ? (
              <div className="space-y-4">
                <p className="text-center text-emerald-600 text-sm">
                  נשלח קוד לאימייל. בדוק את תיבת הדואר.
                </p>
                <Link
                  href={`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}&teacher=1`}
                >
                  <Button className="w-full">המשך להזנת קוד</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="teacher-login-email"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    אימייל
                  </label>
                  <Input
                    id="teacher-login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
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

      </div>
    </div>
  );
}
