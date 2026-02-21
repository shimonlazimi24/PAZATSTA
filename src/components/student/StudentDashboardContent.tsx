"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { CalendarDays, FileDown } from "lucide-react";
import { MOCK_TEACHERS, MOCK_SLOTS, MOCK_MY_LESSONS } from "@/lib/mock-data";

const TEACHER_OPTIONS = MOCK_TEACHERS.map((t) => ({ value: t.id, label: t.name }));

export function StudentDashboardContent() {
  const [selectedTeacherId, setSelectedTeacherId] = React.useState("");
  const [bookingOpen, setBookingOpen] = React.useState(false);
  const [bookingSlot, setBookingSlot] = React.useState<typeof MOCK_SLOTS[0] | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formPhone, setFormPhone] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formQuestion, setFormQuestion] = React.useState("");

  const slots = selectedTeacherId ? MOCK_SLOTS : [];
  const upcomingLessons = MOCK_MY_LESSONS.filter((l) => l.status === "upcoming");
  const pastLessons = MOCK_MY_LESSONS.filter((l) => l.status === "past");

  const openBooking = (slot: typeof MOCK_SLOTS[0]) => {
    setBookingSlot(slot);
    setBookingOpen(true);
  };

  const closeBooking = () => {
    setBookingOpen(false);
    setBookingSlot(null);
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormQuestion("");
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-1">קביעת שיעור</h2>
        <p className="text-sm text-muted-foreground mb-4">בחר מורה ומועד מתאים</p>
        <Card className="rounded-2xl shadow-soft border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">מורה</label>
              <Select
                options={TEACHER_OPTIONS}
                placeholder="בחר מורה"
                value={selectedTeacherId}
                onChange={setSelectedTeacherId}
              />
            </div>
            {selectedTeacherId && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">מועדים פנויים</label>
                {slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">אין מועדים פנויים בשבועיים הקרובים</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <Button
                        key={slot.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openBooking(slot)}
                      >
                        {new Date(slot.date + "T12:00:00").toLocaleDateString("he-IL", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        {slot.startTime}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-1">השיעורים שלי</h2>
        <p className="text-sm text-muted-foreground mb-4">קרובים ועבר</p>

        <h3 className="text-sm font-medium text-muted-foreground mb-2">הבאים</h3>
        {upcomingLessons.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="אין שיעורים קרובים"
            description="קבע שיעור בסעיף למעלה"
            className="mb-6"
          />
        ) : (
          <ul className="space-y-2 mb-6">
            {upcomingLessons.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-soft"
              >
                <div>
                  <p className="font-medium text-foreground">{l.teacherName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(l.date + "T12:00:00").toLocaleDateString("he-IL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    {l.time}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h3 className="text-sm font-medium text-muted-foreground mb-2">עבר</h3>
        {pastLessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין שיעורים בעבר</p>
        ) : (
          <ul className="space-y-2">
            {pastLessons.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-soft"
              >
                <div>
                  <p className="font-medium text-foreground">{l.teacherName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(l.date + "T12:00:00").toLocaleDateString("he-IL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    {l.time}
                  </p>
                </div>
                {l.hasSummary && (
                  <Button variant="outline" size="sm">
                    הורד סיכום שיעור
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={bookingOpen} onOpenChange={(open) => !open && closeBooking()}>
        <DialogContent title="קבע שיעור" onClose={closeBooking}>
          {bookingSlot && (
            <p className="text-sm text-muted-foreground mb-4">
              {new Date(bookingSlot.date + "T12:00:00").toLocaleDateString("he-IL")} {bookingSlot.startTime}–{bookingSlot.endTime}
            </p>
          )}
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              closeBooking();
            }}
          >
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">שם מלא</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="שם מלא"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">טלפון</label>
              <Input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="טלפון"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">אימייל</label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="אימייל"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">שאלה למורה (אופציונלי)</label>
              <Input
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="שאלה למורה"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeBooking}>
                ביטול
              </Button>
              <Button type="submit">קבע שיעור</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
