"use client";

import { useState } from "react";
import { apiJson } from "@/lib/api";

type Kind = "email" | "phone";

const inputCls =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3 py-2 focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]";
const btnCls =
  "min-h-[40px] rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";
const ghostCls =
  "min-h-[40px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]";

/**
 * The ways a student logs in. A student who signed up with a phone can add an
 * email here, and the other way around; if that address already has an account,
 * the two accounts become one.
 */
export function LoginMethods({
  email,
  phone,
  smsAvailable,
}: {
  email: string | null;
  phone: string | null;
  smsAvailable: boolean;
}) {
  const [adding, setAdding] = useState<Kind | null>(null);
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function start(kind: Kind) {
    setAdding(kind);
    setValue("");
    setCode("");
    setSent(false);
    setError("");
  }

  async function call(step: "send" | "verify") {
    setBusy(true);
    setError("");
    const r = await apiJson<{ merged?: boolean }>("/api/student/link-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, [adding!]: value, ...(step === "verify" ? { code } : {}) }),
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error || "משהו השתבש. נסו שוב");
      return;
    }
    if (step === "send") setSent(true);
    // Reload so the page shows the account as it is now (merged or updated).
    else window.location.reload();
  }

  const row = (label: string, current: string | null, kind: Kind, canAdd: boolean) => (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        <p className="break-all font-medium text-[var(--color-text)]" dir="ltr">
          {current ?? <span className="font-normal text-[var(--color-text-muted)]">אין עדיין</span>}
        </p>
      </div>
      {canAdd && adding !== kind && (
        <button type="button" className={ghostCls} onClick={() => start(kind)}>
          {current ? "שינוי" : kind === "email" ? "הוספת מייל" : "הוספת נייד"}
        </button>
      )}
    </div>
  );

  return (
    <section className="space-y-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
      <h2 className="font-semibold text-[var(--color-text)]">איך אתם נכנסים למערכת</h2>
      <p className="text-sm text-[var(--color-text-muted)]">
        אפשר להיכנס גם עם המייל וגם עם הנייד. אם כבר נרשמתם בדרך השנייה, החשבונות יתאחדו לחשבון אחד עם כל השיעורים.
      </p>
      <div className="divide-y divide-[var(--color-border)]">
        {row("מייל", email, "email", !email)}
        {(smsAvailable || phone) && row("נייד", phone, "phone", smsAvailable)}
      </div>

      {adding && (
        <form
          className="space-y-3 border-t border-[var(--color-border)] pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void call(sent ? "verify" : "send");
          }}
        >
          {!sent ? (
            <div>
              <label htmlFor="link-value" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                {adding === "email" ? "כתובת המייל" : "מספר הנייד"}
              </label>
              <input
                id="link-value"
                type={adding === "email" ? "email" : "tel"}
                inputMode={adding === "email" ? "email" : "tel"}
                placeholder={adding === "email" ? "name@example.com" : "050-0000000"}
                dir="ltr"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                autoFocus
                className={inputCls}
              />
            </div>
          ) : (
            <div>
              <label htmlFor="link-code" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                {adding === "email" ? "הקוד ששלחנו למייל" : "הקוד ששלחנו ב-SMS"}
              </label>
              <input
                id="link-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                dir="ltr"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                className={`${inputCls} text-center tracking-widest`}
              />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || (sent && code.length !== 6)} className={btnCls}>
              {busy ? "רגע…" : sent ? "אישור" : "שלחו לי קוד"}
            </button>
            <button type="button" className={ghostCls} onClick={() => setAdding(null)}>
              ביטול
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
