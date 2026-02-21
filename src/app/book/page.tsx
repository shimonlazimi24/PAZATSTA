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
import { MOCK_TEACHERS, type MockTeacher, type SubjectId } from "@/data/mockTeachers";
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

const SUBJECTS: { id: SubjectId; title: string; subtitle: string }[] = [
  { id: "math", title: "מתמטיקה", subtitle: "יסודי | חטיבה | תיכון" },
  { id: "english", title: "אנגלית", subtitle: "יסודי | חטיבה | תיכון" },
  { id: "physics", title: "פיזיקה", subtitle: "תיכון | בגרויות" },
  { id: "language", title: "לשון והבעה", subtitle: "חטיבה | תיכון" },
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
  const [subjectId, setSubjectId] = useState<SubjectId | null>(null);
  const [teacher, setTeacher] = useState<MockTeacher | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<MockSlot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
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
    if (!subjectId) return MOCK_TEACHERS;
    return MOCK_TEACHERS.filter((t) => t.subjects.includes(subjectId));
  }, [subjectId]);

  const canProceedStep1 = subjectId !== null;
  const canProceedStep2 = teacher !== null;
  const canProceedStep3 = selectedDate !== null && selectedSlot !== null;

  function validateStep5(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "נא להזין שם מלא";
    if (!phone.trim()) e.phone = "נא להזין טלפון";
    else if (!isValidPhone(phone)) e.phone = "נא להזין מספר טלפון תקין (9–11 ספרות)";
    if (!email.trim()) e.email = "נא להזין אימייל";
    else if (!isValidEmail(email)) e.email = "נא להזין כתובת אימייל תקינה";
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
        subjectTitle,
        teacherName: teacher?.name ?? "",
        date: selectedDate ?? "",
        startTime: selectedSlot?.startTime ?? "",
        endTime: selectedSlot?.endTime ?? "",
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

  const subjectTitle = SUBJECTS.find((s) => s.id === subjectId)?.title ?? "";

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <BackLink href="/welcome" label="חזרה לדף הבית" />
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text)] text-right">קביעת שיעור</h1>
          <div className="mt-4">
            <Stepper steps={STEPS} currentStep={step} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <MyLessonsBlock />
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-[var(--color-text-muted)] text-right">בחרו מקצוע</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {SUBJECTS.map((subj) => (
                <div
                  key={subj.id}
                  onClick={() => setSubjectId(subj.id)}
                  className={`cursor-pointer ${subjectId === subj.id ? "ring-2 ring-[var(--color-primary)] rounded-[var(--radius-card)]" : ""}`}
                >
                  <CategoryCard
                    title={subj.title}
                    subtitle={subj.subtitle}
                    href=""
                    imagePlaceholder={false}
                  />
                </div>
              ))}
            </div>
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
              <FormField label="הערות (אופציונלי)" name="notes" value={notes} onChange={setNotes} />
            </div>
          </Card>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <SummaryCard
              title="סיכום הזמנה"
              rows={[
                { label: "מקצוע", value: subjectTitle },
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
