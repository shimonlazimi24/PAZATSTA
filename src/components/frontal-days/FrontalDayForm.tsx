"use client";

import { useState } from "react";

export type FrontalDayValues = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  address: string;
  topic: string;
  presentationUrl: string;
  contactName: string;
  contactPhone: string;
  whatsappUrl: string;
  courseCode: string;
  courseUrl: string;
  recipientName: string;
  recipientEmail: string;
  teachersNeeded: number;
  /** Expected number of students, for "23 of 30 answered the survey". */
  classSize: number | null;
};

export const EMPTY_DAY: FrontalDayValues = {
  title: "",
  date: "",
  startTime: "08:30",
  endTime: "13:00",
  address: "",
  topic: "",
  presentationUrl: "",
  contactName: "",
  contactPhone: "",
  whatsappUrl: "",
  courseCode: "",
  courseUrl: "",
  recipientName: "",
  recipientEmail: "",
  teachersNeeded: 2,
  classSize: null,
};

const input = "w-full min-h-[44px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3 py-2 text-right";
const lbl = "mb-1 block text-sm font-medium text-[var(--color-text)]";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={lbl}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-[var(--color-border)] pt-5 first:border-t-0 first:pt-0">
      <legend className="mb-1 text-base font-semibold text-[var(--color-text)]">{title}</legend>
      {children}
    </fieldset>
  );
}

/** All the details of a day, grouped the way the admin thinks about them. */
export function FrontalDayForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: FrontalDayValues;
  submitLabel: string;
  onSubmit: (v: FrontalDayValues) => Promise<string | null>;
}) {
  const [v, setV] = useState(initial);
  const [withCourse, setWithCourse] = useState(Boolean(initial.courseUrl || initial.courseCode));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FrontalDayValues>(k: K) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((s) => ({ ...s, [k]: k === "teachersNeeded" ? Number(e.target.value) : e.target.value }));

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (withCourse && !v.courseUrl.trim() && !v.courseCode.trim()) {
          setError("סימנתם שהיום כולל קורס מתנה. הוסיפו קישור לקורס או קוד גישה, או בטלו את הסימון.");
          return;
        }
        setSaving(true);
        setError(null);
        const err = await onSubmit(v);
        setSaving(false);
        if (err) setError(err);
      }}
      className="space-y-6 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5"
    >
      <Group title="איפה ומתי">
        <Field id="fd-title" label="בית הספר או המקום">
          <input id="fd-title" className={input} value={v.title} onChange={set("title")} placeholder="תיכון אורט רמת גן" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="fd-date" label="תאריך">
            <input id="fd-date" type="date" className={input} value={v.date} onChange={set("date")} />
          </Field>
          <Field id="fd-start" label="התחלה">
            <input id="fd-start" type="time" className={input} value={v.startTime} onChange={set("startTime")} />
          </Field>
          <Field id="fd-end" label="סיום">
            <input id="fd-end" type="time" className={input} value={v.endTime} onChange={set("endTime")} />
          </Field>
        </div>
        <Field id="fd-address" label="כתובת" hint="ממנה נבנה קישור הניווט בוויז שהמורים מקבלים.">
          <input id="fd-address" className={input} value={v.address} onChange={set("address")} placeholder="רחוב, מספר, עיר" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field id="fd-topic" label="נושא היום">
            <input id="fd-topic" className={input} value={v.topic} onChange={set("topic")} />
          </Field>
          <Field id="fd-needed" label="מורים דרושים">
            <input id="fd-needed" type="number" min={1} max={50} className={input} value={v.teachersNeeded} onChange={set("teachersNeeded")} />
          </Field>
        </div>
      </Group>

      <Group title="מה המורים מקבלים">
        <Field id="fd-pres" label="קישור למצגת" hint="קישור לשיתוף מ-Google Drive או מקום דומה.">
          <input id="fd-pres" dir="ltr" className={input} value={v.presentationUrl} onChange={set("presentationUrl")} placeholder="https://" />
        </Field>
        <Field id="fd-wa" label="קישור לקבוצת הוואטסאפ" hint="פתחו את הקבוצה בוואטסאפ, העתיקו את קישור ההזמנה והדביקו כאן.">
          <input id="fd-wa" dir="ltr" className={input} value={v.whatsappUrl} onChange={set("whatsappUrl")} placeholder="https://chat.whatsapp.com/" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="fd-cname" label="איש קשר במקום">
            <input id="fd-cname" className={input} value={v.contactName} onChange={set("contactName")} />
          </Field>
          <Field id="fd-cphone" label="טלפון איש הקשר">
            <input id="fd-cphone" dir="ltr" type="tel" className={input} value={v.contactPhone} onChange={set("contactPhone")} />
          </Field>
        </div>
      </Group>

      <Group title="סוף היום">
        <Field id="fd-class" label="כמה תלמידים צפויים (רשות)" hint="כדי לראות כמה מתוך הכיתה ענו על סקר המשוב. הסקר עצמו מגיע מהמערכת, עם QR שהמורה מציג בסוף היום.">
          <input
            id="fd-class"
            type="number"
            inputMode="numeric"
            min={1}
            max={2000}
            className={`${input} sm:w-48`}
            value={v.classSize ?? ""}
            onChange={(e) => setV((s) => ({ ...s, classSize: e.target.value === "" ? null : Number(e.target.value) }))}
          />
        </Field>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
            checked={withCourse}
            onChange={(e) => {
              setWithCourse(e.target.checked);
              if (!e.target.checked) setV((x) => ({ ...x, courseUrl: "", courseCode: "" }));
            }}
          />
          <span>
            <span className="block text-sm font-medium text-[var(--color-text)]">היום כולל גישה לקורס מתנה לתלמידים</span>
            <span className="block text-xs text-[var(--color-text-muted)]">
              בסוף היום המורה יציג לתלמידים QR לקורס ואת קוד הגישה. בלי הסימון, לא יופיע קורס.
            </span>
          </span>
        </label>
        {withCourse && (
          <div className="grid gap-4 border-r-2 border-[var(--color-border)] pr-4 sm:grid-cols-2">
            <Field id="fd-course-url" label="קישור לקורס בחינם" hint="מדביקים כאן את הקישור לקורס, וממנו נוצר קוד ה-QR שהתלמידים סורקים.">
              <input id="fd-course-url" dir="ltr" className={input} value={v.courseUrl} onChange={set("courseUrl")} placeholder="https://pazatsta.co.il/share-cart/…" />
            </Field>
            <Field id="fd-course-code" label="קוד גישה לקורס (רשות)" hint="רק אם הקישור לבד לא מספיק. אותו קוד לכל התלמידים ביום הזה.">
              <input id="fd-course-code" dir="ltr" className={input} value={v.courseCode} onChange={set("courseCode")} />
            </Field>
          </div>
        )}
      </Group>

      <Group title="למי נשלח דוח הסיום">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="fd-rname" label="שם">
            <input id="fd-rname" className={input} value={v.recipientName} onChange={set("recipientName")} placeholder="למשל: רכזת השכבה" />
          </Field>
          <Field id="fd-remail" label="אימייל" hint="הדוח נשלח לכאן אחרי שתאשרו אותו.">
            <input id="fd-remail" dir="ltr" type="email" className={input} value={v.recipientEmail} onChange={set("recipientEmail")} />
          </Field>
        </div>
      </Group>

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={saving} className="min-h-[44px] rounded-[var(--radius-input)] bg-[var(--color-primary)] px-6 font-medium text-white disabled:opacity-50">
        {saving ? "שומר…" : submitLabel}
      </button>
    </form>
  );
}
