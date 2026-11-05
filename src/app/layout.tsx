import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConditionalFooter } from "@/components/ConditionalFooter";

// Heebo is served from /public/fonts (see globals.css), not fetched from Google
// during the build: that download kept failing and broke deploys.

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "שיעורים פרטיים | קביעת שיעור",
  description: "שיעורים פרטיים שמביאים תוצאות. מורים מעולים, התאמה אישית, וזמינות נוחה.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="font-heebo">
      <body className="min-h-screen antialiased flex flex-col" dir="rtl">
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
        <ConditionalFooter />
      </body>
    </html>
  );
}
