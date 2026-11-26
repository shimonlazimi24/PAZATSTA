"use client";

import { useEffect, useState } from "react";
import { BOOKING_TOPIC_LABELS } from "@/data/topics";

/** Every topic a teacher can hold as a specialty: the built-in ones plus those the admin added. */
export function useSpecialtyLabels(): string[] {
  const [labels, setLabels] = useState<string[]>([...BOOKING_TOPIC_LABELS]);
  useEffect(() => {
    fetch("/api/topics")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { label: string }[]) => {
        if (Array.isArray(list) && list.length) setLabels(Array.from(new Set([...BOOKING_TOPIC_LABELS, ...list.map((t) => t.label)])));
      })
      .catch(() => {});
  }, []);
  return labels;
}
