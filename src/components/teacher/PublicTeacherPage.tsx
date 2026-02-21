"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/design/Button";
import { Section } from "@/components/design/Section";
import { Card } from "@/components/design/Card";

const WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

const STORAGE_KEY = "teacher-availability";

interface StoredBlock {
  day: number;
  start: number;
  end: number;
}

function loadStored(): StoredBlock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStored(blocks: StoredBlock[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
}

function getCellState(day: number, hour: number, blocks: StoredBlock[]): "free" | "blocked" {
  for (const b of blocks) {
    if (b.day !== day) continue;
    if (hour >= b.start && hour < b.end) return "blocked";
  }
  return "free";
}

export function PublicTeacherPage() {
  const [blocks, setBlocks] = useState<StoredBlock[]>([]);

  useEffect(() => {
    setBlocks(loadStored());
  }, []);

  const toggleCell = (day: number, hour: number) => {
    const state = getCellState(day, hour, blocks);
    if (state === "blocked") {
      setBlocks((prev) => {
        const next = prev.filter(
          (b) => !(b.day === day && hour >= b.start && hour < b.end)
        );
        saveStored(next);
        return next;
      });
    } else {
      setBlocks((prev) => {
        const next = [...prev, { day, start: hour, end: hour + 1 }];
        saveStored(next);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/welcome" className="flex shrink-0">
            <Logo alt="Paza" className="h-8 w-auto object-contain" width={100} height={28} />
          </Link>
          <div className="flex gap-2">
            <Link href="/login/teacher">
              <Button>כניסה למורים</Button>
            </Link>
<Link href="/welcome">
            <Button variant="secondary">דף הבית</Button>
          </Link>
          </div>
        </div>
      </header>

      <Section>
        <h1 className="text-3xl font-extrabold text-[var(--color-text)] text-right mb-2">
          ניהול זמינות
        </h1>
        <p className="text-[var(--color-text-muted)] text-right mb-8">
          סמנו את השעות שבהן אתם פנויים. לחיצה על משבצת מוסיפה/מסירה זמינות.
        </p>

        <Card className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-8 gap-px bg-[var(--color-border)]">
              <div className="bg-[var(--color-bg-muted)] p-2 text-center text-sm font-medium text-[var(--color-text-muted)]" />
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="bg-[var(--color-bg-muted)] p-2 text-center text-sm font-bold text-[var(--color-text)]"
                >
                  {d}
                </div>
              ))}
              {HOURS.map((hour) => (
                <React.Fragment key={hour}>
                  <div className="bg-white p-2 text-sm text-[var(--color-text-muted)] text-left">
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                  {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                    const state = getCellState(dayIndex, hour, blocks);
                    return (
                      <button
                        key={`${dayIndex}-${hour}`}
                        type="button"
                        onClick={() => toggleCell(dayIndex, hour)}
                        className={
                          state === "blocked"
                            ? "h-10 w-full bg-[var(--color-primary)] rounded transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            : "h-10 w-full bg-white rounded transition-colors hover:bg-[var(--color-bg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        }
                        title={state === "blocked" ? "פנוי — לחצו להסרה" : "לא פנוי — לחצו להוספה"}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Card>

        <p className="mt-4 text-sm text-[var(--color-text-muted)] text-right">
          משבצות בירוק = זמינות פעילה. השינויים נשמרים locally בדפדפן. להתחבר כמורה לניהול אמיתי.
        </p>
      </Section>
    </div>
  );
}
