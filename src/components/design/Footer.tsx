"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-muted)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4 text-right">
          <div>
            <Link href="/" className="inline-block">
              <Image src="/logo.svg" alt="Paza" width={100} height={28} className="h-7 w-auto object-contain" />
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
              <li><Link href="/teacher" className="hover:text-[var(--color-text)]">למורים</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[var(--color-text)]">יצירת קשר</h4>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">אימייל: info@example.com</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">טלפון: 03-1234567</p>
          </div>
          <div>
            <h4 className="font-bold text-[var(--color-text)]">וואטסאפ</h4>
            <a
              href="#"
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
