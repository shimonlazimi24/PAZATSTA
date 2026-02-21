"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-muted)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4 text-right">
          <div>
            <Link href="/welcome" className="inline-block">
              <Logo alt="Paza" className="h-7 w-auto object-contain" width={100} height={28} />
            </Link>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              שיעורים פרטיים שמביאים תוצאות.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-[var(--color-text)]">קישורים</h4>
            <ul className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">
              <li><Link href="/#how" className="hover:text-[var(--color-text)]">איך זה עובד</Link></li>
              <li><Link href="/#subjects" className="hover:text-[var(--color-text)]">מקצועות</Link></li>
              <li><Link href="/book" className="hover:text-[var(--color-text)]">קביעת שיעור</Link></li>
              <li><Link href="/teacher/dashboard" className="hover:text-[var(--color-text)]">למורים</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[var(--color-text)]">יצירת קשר</h4>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              אימייל:{" "}
              <a
                href="mailto:info@pazatsta.co.il"
                className="text-[var(--color-primary)] hover:underline"
              >
                info@pazatsta.co.il
              </a>
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              טלפון:{" "}
              <a
                href="tel:050-2632320"
                className="text-[var(--color-primary)] hover:underline"
              >
                050-2632320
              </a>
            </p>
          </div>
          <div>
            <h4 className="font-bold text-[var(--color-text)]">וואטסאפ</h4>
            <a
              href="https://wa.me/972502632320"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-[var(--color-primary)] hover:underline"
            >
              שלחו הודעה
            </a>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
          © {new Date().getFullYear()} כל הזכויות שמורות.
        </p>
      </div>
    </footer>
  );
}
