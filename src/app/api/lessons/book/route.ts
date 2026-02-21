import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { sendBookingConfirmation } from "@/lib/email";

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || (user.role !== "student" && user.role !== "parent")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const availabilityId = typeof body.availabilityId === "string" ? body.availabilityId : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const questionFromStudent = typeof body.questionFromStudent === "string" ? body.questionFromStudent.trim() : null;

    if (!availabilityId || !fullName || !phone || !email) {
      return NextResponse.json(
        { error: "availabilityId, fullName, phone, email required" },
        { status: 400 }
      );
    }

    const slot = await prisma.availability.findFirst({
      where: { id: availabilityId, isAvailable: true },
      include: { teacher: true },
    });
    if (!slot) {
      return NextResponse.json(
        { error: "Slot not found or no longer available" },
        { status: 400 }
      );
    }

    let studentId: string;
    if (user.role === "student") {
      studentId = user.id;
    } else {
      const student = await prisma.user.findFirst({
        where: { email, role: "student" },
        include: { studentProfile: true },
      });
      if (!student) {
        return NextResponse.json(
          { error: "Student email not found. Student must have an account." },
          { status: 400 }
        );
      }
      studentId = student.id;
      if (student.studentProfile) {
        await prisma.studentProfile.update({
          where: { userId: student.id },
          data: { parentId: user.id },
        });
      } else {
        await prisma.studentProfile.upsert({
          where: { userId: student.id },
          create: { userId: student.id, parentId: user.id },
          update: { parentId: user.id },
        });
      }
    }

    const [lesson] = await prisma.$transaction([
      prisma.lesson.create({
        data: {
          teacherId: slot.teacherId,
          studentId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "scheduled",
          questionFromStudent: questionFromStudent || undefined,
        },
        include: {
          teacher: true,
          student: true,
        },
      }),
      prisma.availability.delete({ where: { id: slot.id } }),
    ]);

    const dateStr = lesson.date.toISOString().slice(0, 10);
    const timeRange = `${lesson.startTime}–${lesson.endTime}`;
    const teacherName = lesson.teacher.name || lesson.teacher.email;
    const studentName = fullName || lesson.student.name || lesson.student.email;

    const adminUsers = await prisma.user.findMany({
      where: { role: "admin" },
      select: { email: true },
    });
    const toEmails = [
      lesson.teacher.email,
      lesson.student.email,
      ...adminUsers.map((a) => a.email),
    ];
    if (user.role === "parent" && email && !toEmails.includes(email)) {
      toEmails.push(email);
    }
    const uniqueTo = Array.from(new Set(toEmails));

    await sendBookingConfirmation({
      to: uniqueTo,
      studentName,
      teacherName,
      date: dateStr,
      timeRange,
    });

    return NextResponse.json({
      id: lesson.id,
      date: dateStr,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      teacher: { id: lesson.teacher.id, name: teacherName, email: lesson.teacher.email },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to book lesson" },
      { status: 500 }
    );
  }
}
