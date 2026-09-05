import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { ConditionalFooter } from "@/components/ConditionalFooter";

// Self-hosted by Next at build time: no render-blocking request to a third-party
// font CDN, and no CSP exception needed for fonts.googleapis.com.
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-heebo",
});

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
    <html lang="he" dir="rtl" className={`${heebo.variable} font-heebo`}>
      <body className="min-h-screen antialiased flex flex-col" dir="rtl">
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
        <ConditionalFooter />
      </body>
    </html>
  );
}
