import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--color-bg)]" dir="rtl">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">404</h1>
      <p className="text-[var(--color-text-muted)] mt-2">הדף לא נמצא</p>
      <Link
        href="/"
        className="mt-6 text-[var(--color-primary)] underline hover:no-underline"
      >
        ← חזרה להתחברות
      </Link>
    </div>
  );
}
