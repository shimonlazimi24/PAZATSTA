"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { BackLink } from "@/components/design/BackLink";
import { apiJson } from "@/lib/api";

type Step = "email" | "code";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sendMessage, setSendMessage] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading" | "error">("idle");
  const [verifyMessage, setVerifyMessage] = useState("");
  const codeInputRef = useRef<HTMLInputElement>(null);

  const emailTrimmed = email.trim().toLowerCase();
  const codeDigitsOnly = code.replace(/\D/g, "").slice(0, 6);

  useEffect(() => {
    if (step === "code") {
      codeInputRef.current?.focus();
    }
  }, [step]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!emailTrimmed) return;
    setSendMessage("");
    setSendStatus("sending");
    setStep("code");
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendStatus("error");
        setSendMessage(data.error || "שליחת הקוד נכשלה");
        return;
      }
      setSendStatus("sent");
    } catch {
      setSendStatus("error");
      setSendMessage("שגיאת רשת");
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (verifyStatus === "loading" || codeDigitsOnly.length !== 6) return;
    setVerifyStatus("loading");
    setVerifyMessage("");
    try {
      const result = await apiJson<{ redirect?: string }>("/api/auth/verify-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrimmed,
          code: codeDigitsOnly,
          role: "teacher",
        }),
      });
      if (!result.ok) {
        setVerifyStatus("error");
        setVerifyMessage(result.error || "אימות נכשל");
        return;
      }
      const redirectPath = result.data?.redirect;
      const safePath = typeof redirectPath === "string" && redirectPath.startsWith("/") && !redirectPath.startsWith("//")
        ? redirectPath
        : "/teacher/dashboard";
      router.push(safePath);
    } catch {
      setVerifyStatus("error");
      setVerifyMessage("שגיאה באימות. נסו שוב.");
    }
  }

  return (
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
                {step === "email"
                  ? "הזן את האימייל שלך לקבלת קוד. רק חשבונות מורים יכולים להיכנס מכאן."
                  : "נשלח קוד בן 6 ספרות לאימייל שלך"}
              </p>
            </div>

            {step === "email" ? (
              <form onSubmit={handleSendCode} className="space-y-4">
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
                  />
                </div>
                <Button type="submit" className="w-full">
                  שלחו לי קוד
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label htmlFor="teacher-login-code" className="block text-sm font-medium text-foreground mb-1">
                    קוד
                  </label>
                  <Input
                    ref={codeInputRef}
                    id="teacher-login-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                    disabled={verifyStatus === "loading"}
                  />
                </div>
                {sendStatus === "sending" && (
                  <p className="text-sm text-muted-foreground text-center">שולחים קוד...</p>
                )}
                {sendStatus === "error" && (
                  <p className="text-sm text-destructive text-center">{sendMessage}</p>
                )}
                {verifyMessage && (
                  <p className="text-sm text-destructive text-center">{verifyMessage}</p>
                )}
                <Button
                  type="submit"
                  disabled={verifyStatus === "loading" || codeDigitsOnly.length !== 6}
                  className="w-full"
                >
                  {verifyStatus === "loading" ? "מאמת…" : "אימות"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={sendStatus === "sending"}
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setSendStatus("idle");
                    setSendMessage("");
                  }}
                >
                  חזרה לאימייל
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
