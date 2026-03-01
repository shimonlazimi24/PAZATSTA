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
      className="fixed inset-0 flex flex-col overflow-hidden bg-[#F6F6F6] px-6"
      dir="rtl"
      style={{
        height: "100dvh",
        minHeight: "100vh",
      }}
    >
      <div
        className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-auto py-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 52px)" }}
      >
        {children}
      </div>
      <footer
        className="fixed bottom-0 left-0 right-0 py-4 text-center text-sm text-[var(--color-text-muted)] opacity-70 bg-[#F6F6F6]"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
        }}
      >
        כל הזכויות שמורות © פזצט״א
      </footer>
    </div>
  );
}
