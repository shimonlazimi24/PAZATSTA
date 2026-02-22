import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "./LogoutButton";

type Props = {
  title: string;
  email: string;
  children: React.ReactNode;
};

export function DashboardLayout({ title, email, children }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/book" className="flex shrink-0">
              <Logo alt="Paza Lessons" className="h-8 w-auto object-contain" width={100} height={28} />
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-lg font-medium text-gray-700">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
