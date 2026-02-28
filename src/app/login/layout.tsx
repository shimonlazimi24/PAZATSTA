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
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#F6F6F6] px-6"
      dir="rtl"
      style={{ height: "100dvh", minHeight: "100dvh" }}
    >
      {children}
    </div>
  );
}
