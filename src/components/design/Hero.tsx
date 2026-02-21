"use client";

import Link from "next/link";
import { Button } from "./Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--color-bg-muted)] py-20 md:py-28">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%235a6b47\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 text-right sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold leading-tight text-[var(--color-text)] md:text-5xl lg:text-6xl">
          שיעורים פרטיים שמביאים תוצאות.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--color-text-muted)] md:text-xl">
          מורים מעולים, התאמה אישית, וזמינות נוחה — מתחילים כאן.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/book">
            <Button showArrow>קביעת שיעור</Button>
          </Link>
          <Link href="/#how">
            <Button variant="secondary">איך זה עובד</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
