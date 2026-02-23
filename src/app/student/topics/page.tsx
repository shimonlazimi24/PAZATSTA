"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { BackLink } from "@/components/design/BackLink";
import { apiJson } from "@/lib/api";
import { parseYYYYMMDD, todayIsraelYYYYMMDD } from "@/lib/dates";
import { SCREENING_TOPICS } from "@/data/topics";

type ProfileResponse = {
  currentScreeningType?: string | null;
  currentScreeningDate?: string | null;
};

export default function StudentTopicsPage() {
  const router = useRouter();
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [screeningDate, setScreeningDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiJson<ProfileResponse>("/api/student/profile").then((r) => {
      if (r.ok) {
        const p = r.data;
        setSelectedTopic(p.currentScreeningType ?? "");
        setScreeningDate(p.currentScreeningDate ?? "");
      }
      setLoading(false);
    });
  }, []);

  async function handleContinue() {
    if (!selectedTopic.trim() || !screeningDate.trim()) {
      setError("נא לבחור סוג מיון ותאריך המיון");
      return;
    }
    const parsed = parseYYYYMMDD(screeningDate);
    if (!parsed) {
      setError("נא להזין תאריך בפורמט YYYY-MM-DD");
      return;
    }
    const today = todayIsraelYYYYMMDD();
    if (screeningDate < today) {
      setError("נא לבחור תאריך עתידי");
      return;
    }
    setError("");
    setSaving(true);
    const result = await apiJson<{ ok?: boolean }>("/api/student/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentScreeningType: selectedTopic,
        currentScreeningDate: screeningDate,
      }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/student/book");
  }

  if (loading) {
    return (
      <AppShell title="נושא המיון">
        <p className="text-[var(--color-text-muted)]">טוען…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="נושא המיון">
      <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
        <BackLink href="/student/profile" label="חזרה" />
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">בחר/י סוג מיון</h2>
          <ul className="space-y-2 border border-[var(--color-border)] rounded-[var(--radius-input)] divide-y divide-[var(--color-border)] overflow-hidden bg-white">
            {SCREENING_TOPICS.map((topic) => (
              <li key={topic}>
                <label className="flex items-center gap-2 p-3 cursor-pointer hover:bg-[var(--color-bg-muted)]">
                  <input
                    type="radio"
                    name="topic"
                    value={topic}
                    checked={selectedTopic === topic}
                    onChange={() => {
                      setSelectedTopic(topic);
                      setError("");
                    }}
                    className="rounded-full"
                  />
                  <span className="text-[var(--color-text)]">{topic}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <label htmlFor="screeningDate" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            תאריך המיון
          </label>
          <input
            id="screeningDate"
            type="date"
            value={screeningDate}
            onChange={(e) => {
              setScreeningDate(e.target.value);
              setError("");
            }}
            required
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)]"
          />
        </section>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Link
            href="/student/book"
            className="flex-1 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border)] text-center font-medium text-[var(--color-text)]"
          >
            דילוג לקביעת שיעור
          </Link>
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className="flex-1 py-2.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "שומר…" : "המשך לקביעת שיעור"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
