"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/design/Card";

type Invite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  teacher: "מורה",
  parent: "הורה",
  student: "תלמיד",
  admin: "מנהל",
};

function StatusBadge({ invite }: { invite: Invite }) {
  if (invite.usedAt) {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
        נוצל
      </span>
    );
  }
  if (new Date(invite.expiresAt) < new Date()) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        פג תוקף
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[var(--color-bg-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
      ממתין
    </span>
  );
}

export function InvitesList() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    fetch("/api/admin/invites")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(setInvites)
      .catch(() => setError("טעינת ההזמנות נכשלה"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const onInvite = () => load();
    window.addEventListener("invite-created", onInvite);
    return () => window.removeEventListener("invite-created", onInvite);
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-[var(--color-text-muted)] py-4 text-right">
        טוען…
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-red-600 py-4 text-right">{error}</p>
    );
  }
  if (invites.length === 0) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">
          אין הזמנות עדיין. צור הזמנה למעלה.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <ul className="divide-y divide-[var(--color-border)]">
        {invites.map((i) => (
          <li
            key={i.id}
            className="px-6 py-4 flex flex-wrap items-center justify-between gap-2"
          >
            <div className="text-right">
              <span className="font-medium text-[var(--color-text)]">{i.email}</span>
              <span className="mr-2 text-sm text-[var(--color-text-muted)]">
                {ROLE_LABELS[i.role] ?? i.role}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!i.usedAt && new Date(i.expiresAt) >= new Date() && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  תפוגה: {new Date(i.expiresAt).toLocaleDateString("he-IL")}
                </span>
              )}
              <StatusBadge invite={i} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
