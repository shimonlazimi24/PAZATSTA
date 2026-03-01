"use client";

import { useEffect } from "react";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col justify-between overflow-hidden bg-[#F6F6F6] px-6"
      dir="rtl"
      style={{
        height: "100dvh",
        minHeight: "100vh",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-auto py-4">
        {children}
      </div>
      <footer className="shrink-0 py-4 text-center text-sm text-[var(--color-text-muted)] opacity-70">
        כל הזכויות שמורות © פזצט״א
      </footer>
    </div>
  );
}
