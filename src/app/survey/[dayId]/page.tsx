"use client";

import { use, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { apiJson } from "@/lib/api";
import { isFieldVisible } from "@/lib/frontal-days";
import { ReportFieldInput, type AnswerValue } from "@/components/frontal-days/ReportFieldInput";

type Question = {
  id: string;
  label: string;
  kind: string;
  required: boolean;
  help: string;
  options: string[];
  showIfFieldId: string | null;
  showIfValues: string[];
};
type Survey = { title: string; dateLabel: string; open: boolean; answered: boolean; questions: Question[] };

/** The students' feedback survey, opened from the QR code at the end of a frontal day. No login. */
export default function SurveyPage({ params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = use(params);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loadError, setLoadError] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiJson<Survey>(`/api/survey/${dayId}`).then((r) => {
      if (r.ok) setSurvey(r.data);
      else setLoadError(r.status === 404 ? "הסקר לא נמצא. בדקו שסרקתם את הקוד הנכון." : "לא הצלחנו לטעון את הסקר. נסו שוב בעוד דקה.");
    });
  }, [dayId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const r = await apiJson(`/api/survey/${dayId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    setBusy(false);
    if (r.ok) {
      setDone(true);
      window.scrollTo({ top: 0 });
    } else if (r.status === 409 && r.code === "already_answered") {
      setDone(true);
    } else {
      setError(r.status === 0 ? "אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב." : r.error || "השליחה לא הצליחה. נסו שוב.");
    }
  }

  const visible = survey?.questions.filter((q) => isFieldVisible(q, answers)) ?? [];

  let body: React.ReactNode;
  if (loadError) body = <p className="text-center text-[var(--color-text)]">{loadError}</p>;
  else if (!survey) body = <p className="text-center text-sm text-[var(--color-text-muted)]">טוען…</p>;
  else if (done || survey.answered) body = <p className="text-center text-lg font-medium text-[var(--color-text)]">תודה רבה על המשוב!</p>;
  else if (!survey.open) body = <p className="text-center text-[var(--color-text)]">הסקר של היום הזה כבר סגור. תודה!</p>;
  else
    body = (
      <form onSubmit={submit} className="space-y-5">
        {visible.map((q) => (
          <ReportFieldInput key={q.id} field={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        ))}
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="min-h-[48px] w-full rounded-[var(--radius-input)] bg-[var(--color-primary)] font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "שולח…" : "שליחה"}
        </button>
        <p className="text-center text-xs text-[var(--color-text-muted)]">הסקר אנונימי. לא צריך להירשם או להתחבר.</p>
      </form>
    );

  return (
    <main className="mx-auto w-full max-w-md space-y-5 px-4 py-8">
      <div className="flex justify-center">
        <Logo alt="פזצט״א" className="h-10 w-auto object-contain" width={120} height={40} />
      </div>
      <div className="space-y-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5">
        {survey && !loadError && (
          <div className="text-center">
            <h1 className="text-xl font-semibold text-[var(--color-text)]">משוב על היום</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {survey.title}, {survey.dateLabel}
            </p>
          </div>
        )}
        {body}
      </div>
    </main>
  );
}
