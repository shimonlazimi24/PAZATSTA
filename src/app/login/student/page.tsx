"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/design/BackLink";
import { apiJson } from "@/lib/api";
import {
  normalizeEmailInput,
  requestLoginCode,
  sentHint,
  verifyCodeErrorMessage,
  LOGIN_MESSAGES,
} from "@/lib/login-messages";

type Step = "email" | "code";

export default function StudentLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sendMessage, setSendMessage] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading" | "error">("idle");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [testLoading, setTestLoading] = useState<"teacher" | "student" | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const emailTrimmed = normalizeEmailInput(email);
  const codeDigitsOnly = code.replace(/\D/g, "").slice(0, 6);

  useEffect(() => {
    if (step === "code") {
      codeInputRef.current?.focus();
    }
  }, [step]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!emailTrimmed || sendStatus === "sending") return;
    setSendMessage("");
    setSendStatus("sending");
    // Move to the code step only once the code is actually on its way.
    const result = await requestLoginCode(email, { phone });
    if (!result.ok) {
      setSendStatus("error");
      setSendMessage(result.message);
      return;
    }
    setSendStatus("sent");
    setStep("code");
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
          role: "student",
          phone: phone.trim() || undefined,
        }),
      });
      if (!result.ok) {
        setVerifyStatus("error");
        setVerifyMessage(verifyCodeErrorMessage(result.status, result.error || "אימות נכשל"));
        return;
      }
      const redirectPath = result.data?.redirect;
      const safePath = typeof redirectPath === "string" && redirectPath.startsWith("/") && !redirectPath.startsWith("//")
        ? redirectPath
        : "/student";
      window.location.href = safePath;
    } catch {
      setVerifyStatus("error");
      setVerifyMessage(LOGIN_MESSAGES.temporary);
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
        setVerifyMessage(data.error || "כניסה לבדיקה נכשלה");
        return;
      }
      router.push(role === "teacher" ? "/teacher" : "/student");
      router.refresh();
    } catch {
      setVerifyMessage("שגיאת רשת");
    } finally {
      setTestLoading(null);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
        <BackLink href="/login" label="חזרה לבחירת סוג כניסה" />
        <Card className="rounded-2xl shadow-soft border-border">
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">התחברות כתלמיד/ה</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {step === "email"
                  ? "הזן אימייל וטלפון — יישלח אליכם קוד לאימייל לאימות"
                  : sentHint(emailTrimmed)}
              </p>
              <p className="text-sm mt-2">
                <Link href="/login/teacher" className="text-primary underline hover:no-underline">
                  מורה? היכנס כאן
                </Link>
              </p>
            </div>

            {step === "email" ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-foreground mb-1">
                    אימייל
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                    setEmail(e.target.value);
                    if (sendStatus === "error") {
                      setSendStatus("idle");
                      setSendMessage("");
                    }
                  }}
                    required
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
                  />
                </div>
                {sendStatus === "error" && (
                  <p className="text-sm text-destructive text-center" role="alert">{sendMessage}</p>
                )}
                <Button type="submit" className="w-full" disabled={sendStatus === "sending"}>
                  {sendStatus === "sending" ? "שולח…" : "שלחו לי קוד"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label htmlFor="login-code" className="block text-sm font-medium text-foreground mb-1">
                    קוד
                  </label>
                  <Input
                    ref={codeInputRef}
                    id="login-code"
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
                  שינוי כתובת
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

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
          </CardContent>
        </Card>
        )}
    </div>
  );
}
