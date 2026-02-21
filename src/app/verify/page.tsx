"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.replace(/\D/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Verification failed");
        return;
      }
      router.replace(`/${data.role}`);
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">Enter your code</h1>
            <p className="text-sm text-gray-500 mt-1">We sent a 6-digit code to your email</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="verify-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="verify-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                disabled={status === "loading"}
              />
            </div>
            <div>
              <label htmlFor="verify-code" className="block text-sm font-medium text-gray-700 mb-1">
                Code
              </label>
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 6))}
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg tracking-widest focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                disabled={status === "loading"}
              />
            </div>
            {message && <p className="text-sm text-red-600">{message}</p>}
            <button
              type="submit"
              disabled={status === "loading" || code.length !== 6}
              className="w-full py-2.5 rounded-md bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {status === "loading" ? "Verifying…" : "Verify"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500">
            <Link href="/login" className="text-gray-600 hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <VerifyForm />
    </Suspense>
  );
}
