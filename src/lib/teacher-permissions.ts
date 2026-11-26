import { prisma } from "@/lib/db";

/**
 * What a teacher takes part in. The admin can turn each off per teacher, e.g. a
 * teacher who leads frontal days only and gets no private bookings.
 */
export type TeacherPermissions = { private: boolean; group: boolean; frontal: boolean };

export const ALL_PERMISSIONS: TeacherPermissions = { private: true, group: true, frontal: true };

/** A teacher without a profile row keeps everything, as before permissions existed. */
export async function getTeacherPermissions(userId: string): Promise<TeacherPermissions> {
  const p = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { canPrivate: true, canGroup: true, canFrontal: true },
  });
  return p ? { private: p.canPrivate, group: p.canGroup, frontal: p.canFrontal } : ALL_PERMISSIONS;
}

/** Prisma filter: teachers allowed in an area (no profile counts as allowed). */
export function teachersAllowed(area: "private" | "group" | "frontal") {
  const field = area === "private" ? "canPrivate" : area === "group" ? "canGroup" : "canFrontal";
  return { OR: [{ teacherProfile: { is: null } }, { teacherProfile: { is: { [field]: true } } }] };
}

export const NO_PERMISSION_MESSAGE: Record<"private" | "group" | "frontal", string> = {
  private: "אין לך הרשאה לשיעורים פרטיים. לשינוי פנו לשחר.",
  group: "אין לך הרשאה לשיעורים קבוצתיים. לשינוי פנו לשחר.",
  frontal: "אין לך הרשאה לימים פרונטליים. לשינוי פנו לשחר.",
};
