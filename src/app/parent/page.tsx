import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BrowseTeachers } from "@/components/BrowseTeachers";
import { MyLessonsList } from "@/components/MyLessonsList";

export default async function ParentPage() {
  const user = await getUserFromSession();
  if (!user) redirect("/login");
  if (user.role !== "parent") redirect(`/${user.role}`);

  return (
    <DashboardLayout title="Parent" email={user.email}>
      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Book a lesson for your child
          </h2>
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <BrowseTeachers />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Use your child’s email when booking so they receive the confirmation and summary.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Lessons (your children)
          </h2>
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <MyLessonsList
              apiPath="/api/parent/lessons"
              emptyMessage="No lessons yet. Book a lesson above (use student email)."
              showStudent
            />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
