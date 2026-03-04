"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/design/Card";
import { Button } from "@/components/design/Button";
import { FormField } from "@/components/design/FormField";
import { apiJson } from "@/lib/api";
import { isValidPhone } from "@/lib/validation";
import { BOOKING_TOPIC_LABELS } from "@/data/topics";
import { TeacherAvatar } from "@/components/TeacherAvatar";

type ProfileResponse = {
  name: string;
  phone: string;
  email: string;
  profileImageUrl: string | null;
  avatarType: string | null;
  displayName: string | null;
  bio: string | null;
  specialization: string | null;
  specialties: string[];
};

export default function TeacherProfilePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarType, setAvatarType] = useState<string>("");
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [specialties, setSpecialties] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiJson<ProfileResponse>("/api/teacher/profile").then((r) => {
      if (r.ok) {
        const p = r.data;
        setName(p.name ?? "");
        setPhone(p.phone ?? "");
        setEmail(p.email ?? "");
        setAvatarType(p.avatarType === "male" || p.avatarType === "female" ? p.avatarType : "");
        setProfileImageUrl(p.profileImageUrl ?? "");
        setDisplayName(p.displayName ?? "");
        setBio(p.bio ?? "");
        setSpecialization(p.specialization ?? "");
        setSpecialties(new Set(p.specialties ?? []));
      }
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!isValidPhone(phone.trim())) {
      setError("נא להזין מספר טלפון תקין (9–11 ספרות).");
      return;
    }
    setSaving(true);
    const result = await apiJson<{ ok?: boolean }>("/api/teacher/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        avatarType: avatarType || null,
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        specialization: specialization.trim() || null,
        specialties: Array.from(specialties),
      }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
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
                <TeacherAvatar avatarType={avatarType || null} profileImageUrl={profileImageUrl || null} className="w-28 h-28 rounded-2xl" />
              </div>
              <div className="flex-1 w-full min-w-0 text-right">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  מגדר (לדמות הפרופיל)
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setAvatarType("male"); setSuccess(false); setError(""); }}
                    className={`flex-1 rounded-[var(--radius-input)] border-2 px-4 py-3 text-sm font-medium transition-colors ${
                      avatarType === "male"
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                    }`}
                  >
                    גבר
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAvatarType("female"); setSuccess(false); setError(""); }}
                    className={`flex-1 rounded-[var(--radius-input)] border-2 px-4 py-3 text-sm font-medium transition-colors ${
                      avatarType === "female"
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                    }`}
                  >
                    אישה
                  </button>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">דמות גנרית תוצג בכרטיס המורה</p>
              </div>
            </div>

            <FormField
              label="שם מלא"
              name="name"
              value={name}
              onChange={(v) => { setName(v); setSuccess(false); setError(""); }}
              placeholder="השם שיוצג ללקוחות"
            />
            <FormField
              label="מספר טלפון"
              name="phone"
              type="tel"
              value={phone}
              onChange={(v) => { setPhone(v); setSuccess(false); setError(""); }}
              placeholder="050-1234567"
            />
            <FormField
              label="שם לתצוגה (לסטודנטים)"
              name="displayName"
              value={displayName}
              onChange={(v) => { setDisplayName(v); setSuccess(false); setError(""); }}
              placeholder="השם שיופיע בכרטיס המורה"
            />
            <div className="text-right">
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                התמחויות (לחיצה להפעלה/ביטול)
              </label>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">
                בחרו את המסלולים שבהם אתם מתמחים. רק מורים שמתאימים למסלול יופיעו לתלמידים.
              </p>
              <div className="flex flex-wrap gap-2 justify-start">
                {BOOKING_TOPIC_LABELS.map((topic) => {
                  const isSelected = specialties.has(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        setSpecialties((prev) => {
                          const next = new Set(prev);
                          if (next.has(topic)) next.delete(topic);
                          else next.add(topic);
                          return next;
                        });
                        setSuccess(false);
                        setError("");
                      }}
                      className={`px-3 py-1.5 rounded-[var(--radius-input)] border text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                          : "bg-white border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-right">
              <label htmlFor="bio" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                אודות (ביוגרפיה קצרה)
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => { setBio(e.target.value); setSuccess(false); setError(""); }}
                placeholder="טקסט קצר שיוצג לתלמידים"
                rows={3}
                className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
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
