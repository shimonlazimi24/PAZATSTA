import { redirect } from "next/navigation";

/** The settings group has no page of its own; open its first screen. */
export default function AdminSettingsPage() {
  redirect("/admin/settings/report-fields");
}
