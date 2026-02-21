import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { InviteForm } from "@/components/InviteForm";
import { InvitesList } from "@/components/InvitesList";

export default async function AdminPage() {
  const user = await getUserFromSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(`/${user.role}`);

  return (
    <AdminShell email={user.email}>
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-3 text-right">
            הזמנת משתמש
          </h2>
          <InviteForm />
        </section>
        <section>
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-3 text-right">
            הזמנות אחרונות
          </h2>
          <InvitesList />
        </section>
      </div>
    </AdminShell>
  );
}
