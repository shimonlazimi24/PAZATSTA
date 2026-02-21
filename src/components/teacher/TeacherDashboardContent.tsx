"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Clock, FileCheck } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { CalendarDays, Trash2 } from "lucide-react";
import {
  MOCK_LESSONS,
  MOCK_AVAILABILITY,
  STATS_TODAY,
  STATS_WEEK,
  STATS_PENDING_SUMMARY,
} from "@/lib/mock-data";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "מתוזמן",
  completed: "הושלם",
  canceled: "בוטל",
};
const STATUS_VARIANT: Record<string, "default" | "success" | "destructive"> = {
  scheduled: "default",
  completed: "success",
  canceled: "destructive",
};

type LessonRow = (typeof MOCK_LESSONS)[number];

export function TeacherDashboardContent({ userName }: { userName?: string | null }) {
  const displayName = userName ?? "מורה";
  const [availabilityOpen, setAvailabilityOpen] = React.useState(false);
  const [newDate, setNewDate] = React.useState("");
  const [newStart, setNewStart] = React.useState("09:00");
  const [newEnd, setNewEnd] = React.useState("10:00");

  const columns: { key: keyof LessonRow | string; label: string; render?: (row: LessonRow) => React.ReactNode }[] = [
    { key: "studentName", label: "תלמיד" },
    { key: "date", label: "תאריך" },
    { key: "time", label: "שעה" },
    {
      key: "status",
      label: "סטטוס",
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? "default"}>
          {STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "action",
      label: "",
      render: (row) =>
        row.status === "scheduled" ? (
          <Link href={`/teacher/lesson/${row.id}`}>
            <Button variant="outline" size="sm">סיים שיעור</Button>
          </Link>
        ) : null,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">שלום, {displayName}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">הנה סיכום הלוח שלך</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="שיעורים היום" value={STATS_TODAY} icon={Calendar} />
        <StatCard title="שיעורים השבוע" value={STATS_WEEK} icon={Clock} />
        <StatCard title="ממתינים לסיכום" value={STATS_PENDING_SUMMARY} icon={FileCheck} />
      </div>

      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3">השיעורים הקרובים</h3>
        <DataTable<LessonRow>
          columns={columns}
          data={MOCK_LESSONS}
          keyField="id"
          emptyMessage="אין שיעורים מתוזמנים"
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground">זמינות</h3>
          <Button onClick={() => setAvailabilityOpen(true)}>הוסף זמינות</Button>
        </div>
        <Card className="rounded-2xl shadow-soft border-border">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">שבוע נוכחי</p>
          </CardHeader>
          <CardContent>
            {MOCK_AVAILABILITY.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="אין זמינות"
                description="הוסף חלונות זמינות כדי שהתלמידים יוכלו לקבוע שיעורים"
                action={
                  <Button onClick={() => setAvailabilityOpen(true)}>הוסף זמינות</Button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {MOCK_AVAILABILITY.map((slot) => (
                  <li
                    key={slot.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-2 text-sm"
                  >
                    <span>
                      {new Date(slot.date + "T12:00:00").toLocaleDateString("he-IL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      {slot.startTime}–{slot.endTime}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="מחק"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
        <DialogContent title="הוסף זמינות" onClose={() => setAvailabilityOpen(false)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setAvailabilityOpen(false);
            }}
          >
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">תאריך</label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">שעת התחלה</label>
                <Input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">שעת סיום</label>
                <Input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAvailabilityOpen(false)}>
                ביטול
              </Button>
              <Button type="submit">הוסף</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
