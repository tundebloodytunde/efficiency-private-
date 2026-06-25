import "./globals.css";
import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import AuthSessionProvider from "@/components/SessionProvider";
import QuickCapture from "@/components/QuickCapture";

export const metadata: Metadata = {
  title: "Efficiency",
  description: "Daily workflow for high performers",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Efficiency" },
  icons: { apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');` }} />
      </head>
      <body className="bg-gray-950 text-white min-h-screen">
        <AuthSessionProvider>
          <Navigation />
          <main className="max-w-4xl mx-auto px-6 py-10">
            {children}
          </main>
          <QuickCapture />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
