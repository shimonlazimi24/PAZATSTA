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
  if (studentPhoneFromForm) userData.phone = studentPhoneFromForm;
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
