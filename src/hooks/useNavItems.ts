"use client";

import { useState, useEffect } from "react";
import type { NavItem } from "@/components/layout/SidebarNavContent";
import { TEACHER_NAV, STUDENT_NAV, ADMIN_NAV } from "@/components/layout/SidebarNavContent";

/** Menu items for the signed-in user, and their email for the menu footer. */
export function useNavItems(): NavItem[] & { email?: string } {
  const [state, setState] = useState<{ items: NavItem[]; email?: string }>({ items: [] });

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return setState({ items: [] });
        const { role: r, canAccessAdmin, email } = data;
        const items: NavItem[] = [];
        if (r === "teacher") items.push(...TEACHER_NAV);
        else if (r === "student") items.push(...STUDENT_NAV);
        if (r === "admin" || canAccessAdmin) items.push(...ADMIN_NAV);
        setState({ items: items.length ? items : [...STUDENT_NAV], email });
      })
      .catch(() => setState({ items: [] }));
  }, []);

  return Object.assign([...state.items], { email: state.email });
}
