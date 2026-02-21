import Link from "next/link";
import { Navbar } from "@/components/design/Navbar";
import { Hero } from "@/components/design/Hero";
import { Section } from "@/components/design/Section";
import { CategoryCard } from "@/components/design/CategoryCard";
import { Button } from "@/components/design/Button";
import { Footer } from "@/components/design/Footer";

const CATEGORIES = [
  { title: "מתמטיקה", subtitle: "יסודי | חטיבה | תיכון" },
  { title: "אנגלית", subtitle: "יסודי | חטיבה | תיכון" },
  { title: "פיזיקה", subtitle: "תיכון | בגרויות" },
  { title: "לשון והבעה", subtitle: "חטיבה | תיכון" },
];

const HOW_STEPS = [
  { num: "01", title: "בוחרים מקצוע ורמה" },
  { num: "02", title: "בוחרים מורה וזמן" },
  { num: "03", title: "מקבלים סיכום ומעקב" },
];

const STATS = [
  { value: "92%", label: "שיפור" },
  { value: "4.9", label: "דירוג" },
  { value: "48", label: "שעות התאמה" },
  { value: "1,200", label: "תלמידים" },
];

const TESTIMONIALS = [
  { text: "המורה התאים את עצמו בדיוק לרמה שלי וההתקדמות מורגשת.", author: "תלמידה, כיתה י׳" },
  { text: "תהליך ברור ונוח. קביעת שיעור לוקחת דקות.", author: "הורה" },
  { text: "ממליצה בחום. שיפור משמעותי בציונים.", author: "תלמידה, חטיבה" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />

        <Section id="subjects" className="scroll-mt-20">
          <h2 className="text-3xl font-extrabold text-[var(--color-text)] text-right mb-10">
            מקצועות
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <CategoryCard key={cat.title} title={cat.title} subtitle={cat.subtitle} href="/book" />
            ))}
          </div>
        </Section>

        <Section id="how" muted className="scroll-mt-20">
          <h2 className="text-3xl font-extrabold text-[var(--color-text)] text-right mb-12">
            איך זה עובד
          </h2>
          <div className="space-y-12">
            {HOW_STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`flex flex-col gap-6 md:flex-row md:items-center ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
              >
                <div className="flex items-center justify-center rounded-[var(--radius-card)] bg-white p-8 shadow-card border border-[var(--color-border)] w-24 h-24 md:w-32 md:h-32 shrink-0">
                  <span className="text-3xl font-extrabold text-[var(--color-primary)]">{step.num}</span>
                </div>
                <div className="flex-1 text-right">
                  <h3 className="text-xl font-bold text-[var(--color-text)]">{step.title}</h3>
                  <p className="mt-2 text-[var(--color-text-muted)]">
                    שלב {i + 1} בתהליך — פשוט וברור מההתחלה עד הסיום.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <div className="flex flex-wrap items-center justify-center gap-8 py-6 text-[var(--color-text-muted)]">
            <span className="text-sm font-medium">Trusted by</span>
            <div className="flex gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-24 rounded bg-[var(--color-bg-muted)] flex items-center justify-center text-xs">
                  לוגו {i}
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section muted>
          <h2 className="text-3xl font-extrabold text-[var(--color-text)] text-right mb-10">
            התוצאות מדברות
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-[var(--radius-card)] bg-white p-6 text-center shadow-card border border-[var(--color-border)]">
                <p className="text-4xl font-extrabold text-[var(--color-primary)]">{s.value}</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{s.label}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-3xl font-extrabold text-[var(--color-text)] text-right mb-10">
            מה אומרים עלינו
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.author}
                className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 shadow-card text-right"
              >
                <p className="text-[var(--color-text)]">&ldquo;{t.text}&rdquo;</p>
                <p className="mt-3 text-sm text-[var(--color-text-muted)]">— {t.author}</p>
              </div>
            ))}
          </div>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
