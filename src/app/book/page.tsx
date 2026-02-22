"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Stepper } from "@/components/design/Stepper";
import { BackLink } from "@/components/design/BackLink";
import { Button } from "@/components/design/Button";
import { Card } from "@/components/design/Card";
import { CategoryCard } from "@/components/design/CategoryCard";
import { TeacherCard } from "@/components/design/TeacherCard";
import { DateSelector } from "@/components/design/DateSelector";
import { TimeSlots } from "@/components/design/TimeSlots";
import { FormField } from "@/components/design/FormField";
import { SummaryCard } from "@/components/design/SummaryCard";
import { MyLessonsBlock } from "@/components/MyLessonsBlock";
import { MOCK_TEACHERS, type MockTeacher } from "@/data/mockTeachers";
import {
  generateMockSlotsForDate,
  MOCK_DATES_WEEK,
  type MockSlot,
} from "@/data/mockSlots";

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
    id: "yom100",
    title: "הכנה ליום המאה",
    subs: [
      { id: "yom100-stations", label: "יום המא״ה - תחנות קבוצתיות" },
      { id: "yom100-psycho", label: "יום המא״ה - מבחנים פסיכוטכניים" },
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
    id: "tzav",
    title: "הכנה לצו ראשון",
    subs: [
      { id: "tzav-dapar", label: "צו ראשון - מבחן דפר" },
      { id: "tzav-interview", label: "צו ראשון - ראיון אישי" },
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
      { id: "modiin-sayber", label: "סייבר - מיון ראשוני (מבחנים פסיכוטכניים)" },
      { id: "modiin-atuda", label: "עתודה אקדמאית - ראיון אישי" },
      { id: "modiin-katzina", label: "ייעודי קצונה - ראיון אישי/דינמיקה קבוצתית" },
    ],
  },
];

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

export default function BookPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subOption, setSubOption] = useState<{ id: string; label: string } | null>(null);
  const [teacher, setTeacher] = useState<MockTeacher | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<MockSlot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dateOptions = useMemo(
    () =>
      MOCK_DATES_WEEK.map((date) => ({
        date,
        label: formatDateLabel(date),
        weekday: formatWeekday(date),
      })),
    []
  );

  const slots = useMemo(() => {
    if (!selectedDate) return [];
    return generateMockSlotsForDate(selectedDate);
  }, [selectedDate]);

  const filteredTeachers = useMemo(() => {
    if (!categoryId) return MOCK_TEACHERS;
    return MOCK_TEACHERS.filter((t) => t.subjects.includes("psychometric"));
  }, [categoryId]);

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

  function handleNext() {
    if (step === 1 && !canProceedStep1) return;
    if (step === 2 && !canProceedStep2) return;
    if (step === 3 && !canProceedStep3) return;
    if (step === 4) {
      if (!validateStep5()) return;
    }
    if (step === 5) {
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
      };
      try {
        sessionStorage.setItem("paza_last_booking", JSON.stringify(payload));
      } catch (_) {}
      router.push("/book/success");
      return;
    }
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  const subjectTitle = subOption?.label ?? CATEGORIES.find((c) => c.id === categoryId)?.title ?? "";

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <BackLink href="/login" label="חזרה" />
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text)] text-right">קביעת שיעור</h1>
          <div className="mt-4">
            <Stepper steps={STEPS} currentStep={step} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {step === 1 && <MyLessonsBlock />}
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-[var(--color-text-muted)] text-right">בחרו מסלול</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    setCategoryId(cat.id);
                    setSubOption(null);
                  }}
                  className={`cursor-pointer ${categoryId === cat.id ? "ring-2 ring-[var(--color-primary)] rounded-[var(--radius-card)]" : ""}`}
                >
                  <CategoryCard
                    title={cat.title}
                    subtitle=""
                    href=""
                    imagePlaceholder={false}
                  />
                </div>
              ))}
            </div>
            {categoryId && (
              <div className="space-y-2 pt-4" dir="rtl">
                <p className="text-[var(--color-text-muted)] text-right">בחרו סוג מיון</p>
                <div className="flex flex-wrap gap-2 justify-start">
                  {CATEGORIES.find((c) => c.id === categoryId)?.subs.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubOption(s)}
                      className={`px-4 py-2 rounded-[var(--radius-input)] border text-sm font-medium transition-colors ${
                        subOption?.id === s.id
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                          : "bg-white border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p className="text-[var(--color-text-muted)] text-right">בחרו מורה</p>
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
                <TimeSlots
                  slots={slots}
                  selectedSlotId={selectedSlot?.id ?? null}
                  onSelect={(s) => setSelectedSlot(s as MockSlot)}
                />
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
                label="אימייל"
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
              <FormField label="הערות (אופציונלי)" name="notes" value={notes} onChange={setNotes} />
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
                { label: "אימייל", value: email },
                { label: "שם הורה", value: parentName },
                { label: "טלפון הורה", value: parentPhone },
                ...(notes ? [{ label: "הערות", value: notes }] : []),
              ].filter((r): r is { label: string; value: string } => Boolean(r.value))}
            />
            <Button onClick={handleNext} showArrow className="w-full justify-center">
              אישור וקביעת שיעור
            </Button>
          </div>
        )}

        <div className="mt-10 flex justify-between gap-4">
          {step > 1 && step < 5 ? (
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
  );
}
