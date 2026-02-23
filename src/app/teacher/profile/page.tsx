"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/design/Card";
import { Button } from "@/components/design/Button";
import { FormField } from "@/components/design/FormField";

type ProfileResponse = {
  name: string;
  phone: string;
  email: string;
  profileImageUrl: string | null;
  displayName: string | null;
  bio: string | null;
};

export default function TeacherProfilePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/profile")
      .then((r) => (r.ok ? r.json() : Promise.resolve({})) as Promise<ProfileResponse>)
      .then((p) => {
        setName(p.name ?? "");
        setPhone(p.phone ?? "");
        setEmail(p.email ?? "");
        setProfileImageUrl(p.profileImageUrl ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          profileImageUrl: profileImageUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        setError("שגיאה בשמירה");
        setSaving(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("שגיאת רשת");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <AppShell title="פרטיים אישיים">
        <p className="text-[var(--color-text-muted)] text-right">טוען…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="פרטיים אישיים">
      <div className="max-w-xl mx-auto space-y-6" dir="rtl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="shrink-0">
                <div className="w-28 h-28 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-bg-muted)] overflow-hidden flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt="תמונת פרופיל"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span>תמונה</span>
                  )}
                </div>
              </div>
              <div className="flex-1 w-full min-w-0">
                <label htmlFor="profileImageUrl" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  קישור לתמונת פרופיל
                </label>
                <input
                  id="profileImageUrl"
                  type="url"
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <FormField
              label="שם מלא"
              name="name"
              value={name}
              onChange={setName}
              placeholder="השם שיוצג ללקוחות"
            />
            <FormField
              label="מספר טלפון"
              name="phone"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="050-1234567"
            />
            <div className="text-right">
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                אימייל
              </label>
              <input
                id="email"
                type="email"
                value={email}
                readOnly
                className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-4 py-3 text-[var(--color-text-muted)]"
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">אימייל הכניסה — לא ניתן לעריכה</p>
            </div>

            {error && <p className="text-sm text-red-600 text-right">{error}</p>}
            {success && <p className="text-sm text-green-600 text-right">הפרטים נשמרו בהצלחה.</p>}

            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? "שומר…" : "שמור פרטים"}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
