"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Stepper } from "@/components/design/Stepper";
import { Button } from "@/components/design/Button";
import { Card } from "@/components/design/Card";
import { CategoryCard } from "@/components/design/CategoryCard";
import { TeacherCard } from "@/components/design/TeacherCard";
import { DateSelector } from "@/components/design/DateSelector";
import { TimeSlots } from "@/components/design/TimeSlots";
import { FormField } from "@/components/design/FormField";
import { SummaryCard } from "@/components/design/SummaryCard";
import { AppShell } from "@/components/layout/AppShell";
import type { MockTeacher } from "@/data/mockTeachers";
import { formatIsraelYYYYMMDD, addDaysYYYYMMDD } from "@/lib/dates";
import type { MockSlot } from "@/data/mockSlots";

/** Week dates in Israel (YYYY-MM-DD) so student and teacher see the same calendar days. */
function getBookPageWeekDates(): string[] {
  const startStr = formatIsraelYYYYMMDD(new Date());
  const out: string[] = [startStr];
  for (let i = 1; i < 7; i++) out.push(addDaysYYYYMMDD(startStr, i));
  return out;
}

const STEPS = [
  { label: "מקצוע" },
  { label: "מורה" },
  { label: "תאריך ושעה" },
  { label: "פרטים" },
  { label: "אישור" },
];

const CATEGORIES: {
  id: string;
  title: string;
  subs: { id: string; label: string }[];
}[] = [
  {
    id: "tzav",
    title: "הכנה לצו ראשון",
    subs: [
      { id: "tzav-dapar", label: "צו ראשון - מבחן דפר" },
      { id: "tzav-interview", label: "צו ראשון - ראיון אישי" },
    ],
  },
  {
    id: "yom100",
    title: "הכנה ליום המאה",
    subs: [
      { id: "yom100-stations", label: "יום המא״ה - תחנות קבוצתיות" },
      { id: "yom100-psycho", label: "יום המא״ה - מבחנים פסיכוטכניים" },
    ],
  },
  {
    id: "modiin",
    title: "הכנה למסלולי המודיעין",
    subs: [
      { id: "modiin-haman-psycho", label: "כלל חמ״ן - מבחנים פסיכוטכניים (מיון ראשון)" },
      { id: "modiin-haman-interview", label: "כלל חמ״ן - ראיון אישי/מקצועי" },
      { id: "modiin-haman-dynamics", label: "כלל חמ״ן - מבחני מצב (דינמיקה קבוצתית)" },
      { id: "modiin-shakuf-psycho", label: "שחקים/חבצלות - מבחנים פסיכוטכניים (מיון ראשון)" },
      { id: "modiin-shakuf-interview", label: "שחקים/חבצלות - ראיון אישי/מקצועי" },
      { id: "modiin-shakuf-dynamics", label: "שחקים/חבצלות - מבחני מצב (דינמיקה קבוצתית)" },
    ],
  },
  {
    id: "flight",
    title: "הכנה לקורס טיס",
    subs: [
      { id: "flight-yerapa1", label: "קורס טיס - ירפ״א א׳ (מבחנים פסיכוטכניים)" },
      { id: "flight-yerapa2", label: "קורס טיס - ירפא ב׳ (ראיון פסיכולוג)" },
    ],
  },
  {
    id: "other",
    title: "אחר",
    subs: [
      { id: "other-katzina", label: "ייעודי קצונה - ראיון אישי/דינמיקה קבוצתית" },
      { id: "other-atuda", label: "עתודה אקדמאית - ראיון אישי" },
      { id: "other-sayber", label: "סייבר - מיון ראשוני (מבחנים פסיכוטכניים)" },
      { id: "other-dapar-mishtara", label: "דפ״ר משטרה" },
      { id: "other-shnot-shirut", label: "שנות שירות / מכינה" },
      { id: "other-gadna", label: "גדנע חובלים" },
    ],
  },
];

/** P2: topic group colors — צו ראשון green, יום המאה yellow, מודיעין purple, טייס blue, אחר gray */
const CATEGORY_COLORS: Record<string, { card: string; chip: string; ring: string }> = {
  yom100: { card: "border-yellow-300 bg-yellow-50", chip: "bg-yellow-600 text-white border-yellow-600", ring: "ring-yellow-500" },
  flight: { card: "border-blue-300 bg-blue-50", chip: "bg-blue-600 text-white border-blue-600", ring: "ring-blue-500" },
  tzav: { card: "border-green-300 bg-green-50", chip: "bg-green-600 text-white border-green-600", ring: "ring-green-500" },
  modiin: { card: "border-purple-300 bg-purple-50", chip: "bg-purple-600 text-white border-purple-600", ring: "ring-purple-500" },
  other: { card: "border-gray-300 bg-gray-50", chip: "bg-gray-600 text-white border-gray-600", ring: "ring-gray-500" },
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("he-IL", { weekday: "short" });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 11;
}

// Public API does not return email/phone for privacy.
type ApiTeacher = {
  id: string;
  name: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  specialization: string | null;
  specialties?: string[];
};

function toMockTeacher(t: ApiTeacher): MockTeacher {
  return {
    id: t.id,
    name: t.name || "",
    photo: t.profileImageUrl || "",
    bio: t.bio || "",
    subjects: ["psychometric"],
    rating: 0,
    reviewCount: 0,
    specialties: t.specialties ?? [],
    availabilityLabel: "פנוי",
    specialization: t.specialization ?? null,
  };
}

export default function BookPage() {
  const router = useRouter();
  const [roleChecked, setRoleChecked] = useState(false);
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subOption, setSubOption] = useState<{ id: string; label: string } | null>(null);
  const [teacher, setTeacher] = useState<MockTeacher | null>(null);
  const [apiTeachers, setApiTeachers] = useState<MockTeacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<MockSlot | null>(null);
  const [teacherSlots, setTeacherSlots] = useState<MockSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const subOptionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role === "teacher") {
          router.replace("/teacher/dashboard");
          return;
        }
        if (data?.role === "admin" || data?.canAccessAdmin) {
          router.replace("/admin");
          return;
        }
        setRoleChecked(true);
      })
      .catch(() => setRoleChecked(true));
  }, [router]);

  useEffect(() => {
    if (categoryId && subOptionsRef.current) {
      subOptionsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [categoryId]);

  useEffect(() => {
    if (step !== 2) return;
    const topic = subOption?.label ?? "";
    const url = topic ? `/api/teachers?topic=${encodeURIComponent(topic)}` : "/api/teachers";
    setTeachersLoading(true);
    setApiTeachers([]);
    setTeacher(null);
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ApiTeacher[]) => {
        if (Array.isArray(list)) {
          setApiTeachers(list.map(toMockTeacher));
        }
      })
      .catch(() => setApiTeachers([]))
      .finally(() => setTeachersLoading(false));
  }, [step, subOption?.label]);

  const isRealTeacher = Boolean(teacher?.id && teacher.id.length > 10 && !teacher.id.startsWith("t"));

  useEffect(() => {
    if (!selectedDate || !teacher) {
      setTeacherSlots([]);
      return;
    }
    if (!isRealTeacher) {
      setTeacherSlots([]);
      return;
    }
    setSlotsLoading(true);
    setSelectedSlot(null);
    const nextDay = new Date(selectedDate + "T12:00:00");
    nextDay.setDate(nextDay.getDate() + 1);
    const endDate = nextDay.toISOString().slice(0, 10);
    fetch(
      `/api/teachers/${teacher.id}/availability?start=${selectedDate}&end=${endDate}`
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; date: string; startTime: string; endTime: string }[]) => {
        const forDate = list.filter((s) => s.date === selectedDate).map((s) => ({
          id: s.id,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          available: true,
        }));
        setTeacherSlots(forDate);
      })
      .catch(() => setTeacherSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, teacher?.id, isRealTeacher]);

  useEffect(() => {
    if (!selectedDate) setSelectedSlot(null);
  }, [selectedDate]);

  const dateOptions = useMemo(
    () =>
      getBookPageWeekDates().map((date) => ({
        date,
        label: formatDateLabel(date),
        weekday: formatWeekday(date),
      })),
    []
  );

  const slots = useMemo(() => {
    if (!selectedDate) return [];
    if (isRealTeacher && teacher) return teacherSlots;
    return [];
  }, [selectedDate, isRealTeacher, teacher, teacherSlots]);

  // Teachers are already filtered by API when subOption (topic) is selected
  const filteredTeachers = useMemo(() => apiTeachers, [apiTeachers]);

  const canProceedStep1 = categoryId !== null && subOption !== null;
  const canProceedStep2 = teacher !== null;
  const canProceedStep3 = selectedDate !== null && selectedSlot !== null;

  function validateStep5(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "נא להזין שם מלא";
    if (!phone.trim()) e.phone = "נא להזין טלפון";
    else if (!isValidPhone(phone)) e.phone = "נא להזין מספר טלפון תקין (9–11 ספרות)";
    if (!email.trim()) e.email = "נא להזין אימייל";
    else if (!isValidEmail(email)) e.email = "נא להזין כתובת אימייל תקינה";
    if (!parentName.trim()) e.parentName = "נא להזין שם מלא של אחד ההורים";
    if (!parentPhone.trim()) e.parentPhone = "נא להזין טלפון של אחד ההורים";
    else if (!isValidPhone(parentPhone)) e.parentPhone = "נא להזין מספר טלפון תקין (9–11 ספרות)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleNext() {
    if (step === 1 && !canProceedStep1) return;
    if (step === 2 && !canProceedStep2) return;
    if (step === 3 && !canProceedStep3) return;
    if (step === 4) {
      if (!validateStep5()) return;
    }
    if (step === 5) {
      const isRealTeacherId = teacher?.id && teacher.id.length > 10 && !teacher.id.startsWith("t");
      const payload = {
        subjectTitle: subOption?.label ?? "",
        categoryTitle: CATEGORIES.find((c) => c.id === categoryId)?.title ?? "",
        teacherName: teacher?.name ?? "",
        date: selectedDate ?? "",
        startTime: selectedSlot?.startTime ?? "",
        endTime: selectedSlot?.endTime ?? "",
        name,
        phone,
        email,
        parentName,
        parentPhone,
        notes,
        status: isRealTeacherId && selectedDate && selectedSlot ? "pending_approval" : undefined,
      };
      try {
        sessionStorage.setItem("paza_last_booking", JSON.stringify(payload));
      } catch (_) {}
      if (isRealTeacherId && selectedDate && selectedSlot) {
        try {
          const body: { teacherId: string; date: string; startTime: string; endTime: string; availabilityId?: string; selectedTopic?: string } = {
            teacherId: teacher.id,
            date: selectedDate,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
          };
          if (selectedSlot.id && typeof selectedSlot.id === "string" && selectedSlot.id.length > 10 && !selectedSlot.id.startsWith("slot-")) {
            body.availabilityId = selectedSlot.id;
          }
          if (subOption?.label) body.selectedTopic = subOption.label;
          const res = await fetch("/api/book/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            router.push("/book/success");
            return;
          }
          setErrors({ submit: (data as { error?: string }).error ?? "שגיאה בקביעת השיעור" });
          return;
        } catch (_) {
          setErrors({ submit: "שגיאה בקביעת השיעור" });
          return;
        }
      }
      router.push("/book/success");
      return;
    }
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  const subjectTitle = subOption?.label ?? CATEGORIES.find((c) => c.id === categoryId)?.title ?? "";

  if (!roleChecked) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[var(--color-text-muted)]">טוען…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-bg)]">
        <header className="border-b border-[var(--color-border)] bg-white">
          <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
            <h1 className="text-2xl font-bold text-[var(--color-text)] text-right">קביעת שיעור</h1>
            <div className="mt-4">
              <Stepper steps={STEPS} currentStep={step} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-[var(--color-text-muted)] text-right">בחרו מסלול</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {CATEGORIES.map((cat) => {
                const colors = CATEGORY_COLORS[cat.id];
                const isSelected = categoryId === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setCategoryId(cat.id);
                      setSubOption(null);
                    }}
                    className={`cursor-pointer rounded-[var(--radius-card)] ${isSelected && colors ? `ring-2 ring-offset-2 ${colors.ring}` : ""}`}
                  >
                    <CategoryCard
                      title={cat.title}
                      subtitle=""
                      href=""
                      imagePlaceholder={false}
                      colorClass={colors?.card}
                    />
                  </div>
                );
              })}
            </div>
            {categoryId && (
              <div ref={subOptionsRef} className="space-y-2 pt-4" dir="rtl">
                <p className="text-[var(--color-text-muted)] text-right">בחרו סוג מיון</p>
                <div className="flex flex-wrap gap-2 justify-start">
                  {CATEGORIES.find((c) => c.id === categoryId)?.subs.map((s) => {
                    const colors = CATEGORY_COLORS[categoryId];
                    const isChipSelected = subOption?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSubOption(s)}
                        className={`px-4 py-2 rounded-[var(--radius-input)] border text-sm font-medium transition-colors ${
                          isChipSelected && colors
                            ? colors.chip
                            : "bg-white border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p className="text-[var(--color-text-muted)] text-right">בחרו מורה</p>
            {teachersLoading ? (
              <p className="text-sm text-[var(--color-text-muted)] text-right rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-4">
                טוען מורים…
              </p>
            ) : filteredTeachers.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-right rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-4">
                {subOption
                  ? "אין מורים שמתמחים במסלול שנבחר. נסו מסלול אחר או צרו קשר עם האדמין."
                  : "לא נמצאו מורים. צרו קשר עם האדמין או נסו מאוחר יותר."}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredTeachers.map((t) => (
                  <TeacherCard
                    key={t.id}
                    teacher={t}
                    selected={teacher?.id === t.id}
                    onSelect={() => setTeacher(t)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <p className="text-[var(--color-text-muted)] text-right">בחרו תאריך</p>
            <DateSelector
              options={dateOptions}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
            {selectedDate && (
              <>
                <p className="text-[var(--color-text-muted)] text-right mt-6">בחרו שעה</p>
                {slotsLoading ? (
                  <p className="text-sm text-[var(--color-text-muted)] text-right">טוען משבצות…</p>
                ) : isRealTeacher && slots.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)] text-right rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-4">
                    אין משבצות פנויות בתאריך זה. הזמנים שמוצגים כאן הם אלה שהמורה הגדיר בדשבורד — נסו תאריך אחר או צרו קשר עם המורה.
                  </p>
                ) : (
                  <TimeSlots
                    slots={slots}
                    selectedSlotId={selectedSlot?.id ?? null}
                    onSelect={(s) => setSelectedSlot(s as MockSlot)}
                  />
                )}
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <Card>
            <div className="space-y-4">
              <FormField
                label="שם מלא"
                name="name"
                value={name}
                onChange={(v) => {
                  setName(v);
                  if (errors.name) setErrors((e) => ({ ...e, name: "" }));
                }}
                required
                error={errors.name}
              />
              <FormField
                label="טלפון"
                name="phone"
                type="tel"
                value={phone}
                onChange={(v) => {
                  setPhone(v);
                  if (errors.phone) setErrors((e) => ({ ...e, phone: "" }));
                }}
                required
                error={errors.phone}
              />
              <FormField
                label="אימייל תלמיד"
                name="email"
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  if (errors.email) setErrors((e) => ({ ...e, email: "" }));
                }}
                required
                error={errors.email}
              />
              <FormField
                label="שם מלא של אחד ההורים"
                name="parentName"
                value={parentName}
                onChange={(v) => {
                  setParentName(v);
                  if (errors.parentName) setErrors((e) => ({ ...e, parentName: "" }));
                }}
                required
                error={errors.parentName}
              />
              <FormField
                label="טלפון של אחד ההורים"
                name="parentPhone"
                type="tel"
                value={parentPhone}
                onChange={(v) => {
                  setParentPhone(v);
                  if (errors.parentPhone) setErrors((e) => ({ ...e, parentPhone: "" }));
                }}
                required
                error={errors.parentPhone}
              />
              <FormField label="במה תרצו להתמקד בשיעור" name="notes" value={notes} onChange={setNotes} />
            </div>
          </Card>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <SummaryCard
              title="סיכום הזמנה"
              rows={[
                { label: "מסלול/סוג מיון", value: subjectTitle },
                { label: "מורה", value: teacher?.name ?? "" },
                {
                  label: "תאריך ושעה",
                  value: selectedDate && selectedSlot
                    ? `${formatDateLabel(selectedDate)} ${selectedSlot.startTime}–${selectedSlot.endTime}`
                    : "",
                },
                { label: "שם", value: name },
                { label: "טלפון", value: phone },
                { label: "אימייל תלמיד", value: email },
                { label: "שם הורה", value: parentName },
                { label: "טלפון הורה", value: parentPhone },
                ...(notes ? [{ label: "הערות", value: notes }] : []),
              ].filter((r): r is { label: string; value: string } => Boolean(r.value))}
            />
            {errors.submit && (
              <p className="text-sm text-red-600 text-right">{errors.submit}</p>
            )}
            <Button onClick={handleNext} showArrow className="w-full justify-center">
              אישור וקביעת שיעור
            </Button>
          </div>
        )}

        <div className="mt-10 flex justify-between gap-4">
          {step > 1 ? (
            <Button variant="secondary" onClick={handleBack}>
              חזרה
            </Button>
          ) : (
            <span />
          )}
          {step < 5 && (
            <Button
              onClick={handleNext}
              showArrow
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
            >
              המשך
            </Button>
          )}
        </div>
        </main>
      </div>
    </AppShell>
  );
}
