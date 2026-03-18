"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/design/Card";
import { Button } from "@/components/design/Button";
import { FormField } from "@/components/design/FormField";
import { TeacherAvailability } from "@/components/TeacherAvailability";
import { TeacherAvatar } from "@/components/TeacherAvatar";
import { apiJson } from "@/lib/api";
import { isValidPhone } from "@/lib/validation";
import { BOOKING_TOPIC_LABELS } from "@/data/topics";
import { formatIsraelYYYYMMDD, addDaysYYYYMMDD } from "@/lib/dates";

type TeacherProfile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  specialization: string | null;
  specialties: string[];
  avatarType: string | null;
  profileImageUrl: string | null;
};

function getWeekDatesIsrael(): string[] {
  const startStr = formatIsraelYYYYMMDD(new Date());
  const out: string[] = [startStr];
  for (let i = 1; i < 14; i++) out.push(addDaysYYYYMMDD(startStr, i));
  return out;
}

export function AdminTeacherEdit({ teacherId }: { teacherId: string }) {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarType, setAvatarType] = useState<string>("");
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState<Set<string>>(new Set());

  const weekDates = useMemo(() => getWeekDatesIsrael(), []);

  useEffect(() => {
    apiJson<TeacherProfile>(`/api/admin/teachers/${teacherId}`).then((r) => {
      if (r.ok) {
        const p = r.data;
        setProfile(p);
        setName(p.name ?? "");
        setPhone(p.phone ?? "");
        setEmail(p.email ?? "");
        setAvatarType(p.avatarType === "male" || p.avatarType === "female" ? p.avatarType : "");
        setProfileImageUrl(p.profileImageUrl ?? "");
        setDisplayName(p.displayName ?? "");
        setBio(p.bio ?? "");
        setSpecialties(new Set(p.specialties ?? []));
      }
      setLoading(false);
    });
  }, [teacherId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!isValidPhone(phone.trim())) {
      setError("נא להזין מספר טלפון תקין (9–11 ספרות).");
      return;
    }
    setSaving(true);
    const result = await apiJson<{ ok?: boolean }>(`/api/admin/teachers/${teacherId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        avatarType: avatarType || null,
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        specialties: Array.from(specialties),
      }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "שגיאה בשמירה");
      return;
    }
    setSuccess(true);
  }

  if (loading) {
    return (
      <div className="max-w-2xl" dir="rtl">
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl" dir="rtl">
        <p className="text-sm text-red-600">מורה לא נמצא.</p>
        <Link href="/admin?section=teachers" className="text-[var(--color-primary)] hover:underline mt-2 inline-block">
          חזרה לרשימת מורים
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8" dir="rtl">
      <div className="flex items-center gap-2">
        <Link
          href="/admin?section=teachers"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
        >
          ← רשימת מורים
        </Link>
      </div>

      <h2 className="text-xl font-bold text-[var(--color-text)]">
        עריכת מורה: {profile.displayName || profile.name || profile.email}
      </h2>

      <Card>
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">פרטים אישיים</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="shrink-0">
              <TeacherAvatar
                avatarType={avatarType || null}
                profileImageUrl={profileImageUrl || null}
                className="w-28 h-28 rounded-2xl"
              />
            </div>
            <div className="flex-1 w-full min-w-0 text-right">
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">מגדר (לדמות הפרופיל)</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAvatarType("male");
                    setSuccess(false);
                    setError("");
                  }}
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
                  onClick={() => {
                    setAvatarType("female");
                    setSuccess(false);
                    setError("");
                  }}
                  className={`flex-1 rounded-[var(--radius-input)] border-2 px-4 py-3 text-sm font-medium transition-colors ${
                    avatarType === "female"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                  }`}
                >
                  אישה
                </button>
              </div>
            </div>
          </div>

          <FormField label="שם מלא" name="name" value={name} onChange={(v) => { setName(v); setSuccess(false); setError(""); }} />
          <FormField
            label="מספר טלפון"
            name="phone"
            type="tel"
            value={phone}
            onChange={(v) => { setPhone(v); setSuccess(false); setError(""); }}
            placeholder="050-1234567"
          />
          <FormField
            label="אימייל"
            name="email"
            type="email"
            value={email}
            onChange={(v) => { setEmail(v); setSuccess(false); setError(""); }}
          />
          <FormField
            label="שם לתצוגה (לסטודנטים)"
            name="displayName"
            value={displayName}
            onChange={(v) => { setDisplayName(v); setSuccess(false); setError(""); }}
            placeholder="השם שיופיע בכרטיס המורה"
          />
          <div className="text-right">
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">התמחויות</label>
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
              אודות (ביוגרפיה)
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

          {error && <p className="text-sm text-red-600 text-right">{error}</p>}
          {success && <p className="text-sm text-green-600 text-right">הפרטים נשמרו בהצלחה.</p>}

          <Button type="submit" disabled={saving}>
            {saving ? "שומר…" : "שמור פרטים"}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">זמינות שבועית</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-2">
          הוספה והסרה של משבצות זמינות עבור המורה.
        </p>
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-[var(--radius-input)] px-3 py-2 mb-4 text-right">
          השינויים נשמרים אוטומטית בלחיצה על המשבצות — אין צורך בלחיצה על &quot;שמור&quot;.
        </p>
        <TeacherAvailability weekDates={weekDates} teacherId={teacherId} />
      </Card>
    </div>
  );
}
