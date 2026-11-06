import { normalizeIsraeliMobile } from "@/lib/phone";
import { findAccountByPhone } from "@/lib/phone-login";
import { prisma } from "@/lib/db";

/** Shared shape from book/submit (and similar flows). */
export type BookingFormProfileFields = {
  studentNameFromForm: string;
  studentPhoneFromForm: string;
  parentNameFromForm: string;
  parentPhoneFromForm: string;
  parentEmailFromForm: string;
};

/**
 * Updates User + StudentProfile when the booking form includes contact details.
 * No-op if all fields are empty.
 */
export async function upsertStudentProfileFromBookingForm(
  userId: string,
  fields: BookingFormProfileFields
): Promise<void> {
  const {
    studentNameFromForm,
    studentPhoneFromForm,
    parentNameFromForm,
    parentPhoneFromForm,
    parentEmailFromForm,
  } = fields;
  if (
    !studentNameFromForm &&
    !studentPhoneFromForm &&
    !parentNameFromForm &&
    !parentPhoneFromForm &&
    !parentEmailFromForm
  ) {
    return;
  }
  const userData: { name?: string; phone?: string } = {};
  if (studentNameFromForm) userData.name = studentNameFromForm;
  // The account phone is also an SMS login key, and a number typed in a form is
  // not confirmed. Save it only when the account has none and no other student
  // uses it, so a typed number can never lock someone out or open their account.
  if (studentPhoneFromForm && (await phoneFreeFor(userId, studentPhoneFromForm))) userData.phone = studentPhoneFromForm;
  if (Object.keys(userData).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: userData,
    });
  }
  const profileData: {
    studentFullName?: string;
    parentFullName?: string;
    parentPhone?: string;
    parentEmail?: string;
  } = {};
  if (studentNameFromForm) profileData.studentFullName = studentNameFromForm;
  if (parentNameFromForm) profileData.parentFullName = parentNameFromForm;
  if (parentPhoneFromForm) profileData.parentPhone = parentPhoneFromForm;
  if (parentEmailFromForm) profileData.parentEmail = parentEmailFromForm;
  await prisma.studentProfile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  });
}

async function phoneFreeFor(userId: string, raw: string): Promise<boolean> {
  const normalized = normalizeIsraeliMobile(raw);
  if (!normalized) return false;
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  if (me?.phone) return false;
  return (await findAccountByPhone(normalized, "student")).kind === "none";
}
