"use client";

import { useState, useEffect } from "react";
import type { NavItem } from "@/components/layout/SidebarNavContent";
import {
  TEACHER_NAV,
  STUDENT_NAV,
  ADMIN_NAV,
} from "@/components/layout/SidebarNavContent";

export function useNavItems(): NavItem[] {
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          setNavItems([]);
          return;
        }
        const { role: r, canAccessAdmin } = data;
        const items: NavItem[] = [];
        if (r === "teacher") items.push(...TEACHER_NAV);
        else if (r === "student") items.push(...STUDENT_NAV);
        if (r === "admin" || canAccessAdmin) items.push(...ADMIN_NAV);
        setNavItems(items.length ? items : [...STUDENT_NAV]);
      })
      .catch(() => setNavItems([]));
  }, []);

  return navItems;
}
