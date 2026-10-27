/**
 * The admin menu, in one place. Every screen has its own URL, so a link can be
 * shared, the back button works, and the menu highlights the right item.
 *
 * New sections (group lessons, frontal days) are added here as a group.
 */

export type AdminNavItem = { href: string; label: string };
export type AdminNavGroup = { title: string | null; items: AdminNavItem[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: null,
    items: [
      { href: "/admin", label: "דורש טיפול" },
      { href: "/admin/calendar", label: "לוח שבועי" },
    ],
  },
  {
    title: "שיעורים פרטיים",
    items: [
      { href: "/admin/pending", label: "ממתינים לאישור" },
      { href: "/admin/workshop", label: "סדנאות" },
    ],
  },
  {
    title: "שיעורים קבוצתיים",
    items: [
      { href: "/admin/group-lessons", label: "לוח חודשי" },
      { href: "/admin/group-lessons/types", label: "סוגי שיעורים" },
    ],
  },
  {
    title: "מדריכים",
    items: [
      { href: "/admin/teachers", label: "רשימת מדריכים" },
      { href: "/admin/teachers/new", label: "הוספת מדריך" },
      { href: "/admin/reminders", label: "תזכורות אישור" },
    ],
  },
  {
    title: "דוחות ותשלום",
    items: [
      { href: "/admin/hours", label: "סיכום שעות לתשלום" },
      { href: "/admin/statistics", label: "סטטיסטיקות" },
    ],
  },
  {
    title: "הגדרות",
    items: [
      { href: "/admin/settings/tips", label: "טיפים לדוח" },
      { href: "/admin/settings/report-fields", label: "שדות דוח הסיכום" },
    ],
  },
];

const ALL_HREFS = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.href));

/**
 * The menu item to highlight: the longest href that is the path itself or a
 * parent of it. /admin/teachers/abc highlights "רשימת מדריכים"; /admin only
 * highlights the home item on exactly /admin.
 */
export function activeAdminHref(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  let best: string | null = null;
  for (const href of ALL_HREFS) {
    const matches = href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/");
    if (matches && (!best || href.length > best.length)) best = href;
  }
  return best;
}

/** Old ?section= links (bookmarks, history) → the screen's own URL. */
export function legacyAdminPath(section: string | null, id: string | null): string | null {
  switch (section) {
    case null:
    case "":
      return null;
    case "weekly":
      return "/admin/calendar";
    case "pending":
      return "/admin/pending";
    case "teacher":
      return "/admin/teachers/new";
    case "teachers":
      return "/admin/teachers";
    case "teacher-edit":
      return id ? `/admin/teachers/${encodeURIComponent(id)}` : "/admin/teachers";
    case "summary":
      return "/admin/hours";
    case "tips":
      return "/admin/settings/tips";
    case "report-fields":
      return "/admin/settings/report-fields";
    default:
      return "/admin";
  }
}
