import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TipsLibraryBlock } from "@/components/admin/TipsLibraryBlock";

export default function AdminTipsPage() {
  return (
    <div className="max-w-3xl">
      <AdminPageHeader title="טיפים לדוח הסיכום" description="ספריית הטיפים שהמדריכים בוחרים מתוכה בדוח." />
      <TipsLibraryBlock />
    </div>
  );
}
